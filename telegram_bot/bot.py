"""Telegram entry point for Spendwise.

Set TELEGRAM_BOT_TOKEN and SPENDWISE_DB, then run:
    python -m telegram_bot.bot
"""

import json
import os
import time
import urllib.parse
import urllib.request
import uuid
from datetime import date

from database.storage import connect_telegram_chat, initialize, load_state, save_state, user_id_for_chat

CATEGORIES = ['Food & drink', 'Transport', 'Shopping', 'Entertainment', 'Housing', 'Utilities', 'Salary', 'Other']
SESSIONS = {}
TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
API = f'https://api.telegram.org/bot{TOKEN}/'


def telegram(method, **fields):
    encoded = {}
    for key, value in fields.items():
        encoded[key] = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
    request = urllib.request.Request(API + method, urllib.parse.urlencode(encoded).encode())
    with urllib.request.urlopen(request, timeout=40) as response:
        return json.load(response)['result']


def send(chat_id, text, keyboard=None):
    options = {'chat_id': chat_id, 'text': text}
    if keyboard:
        options['reply_markup'] = {'inline_keyboard': keyboard}
    telegram('sendMessage', **options)


def answer(callback_id):
    telegram('answerCallbackQuery', callback_query_id=callback_id)


def format_money(amount):
    return f'{amount:,.0f} VND'


def workspace(chat_id):
    user_id = user_id_for_chat(chat_id)
    return (user_id, load_state(user_id)) if user_id else (None, None)


def menu(chat_id):
    send(chat_id, '💰 SPENDWISE\nChoose an action:', [
        [{'text': '💰 Money In', 'callback_data': 'menu:in'}, {'text': '💸 Money Out', 'callback_data': 'menu:out'}],
        [{'text': '💳 Balance', 'callback_data': 'menu:balance'}, {'text': '📊 Today', 'callback_data': 'menu:today'}],
        [{'text': '📅 This month', 'callback_data': 'menu:month'}]
    ])


def require_workspace(chat_id):
    user_id, state = workspace(chat_id)
    if not user_id:
        send(chat_id, 'Connect this chat first. Create a code in Spendwise Settings, then send /connect CODE.')
        return None, None
    return user_id, state or {'accounts': [], 'transactions': []}


def total_balance(state):
    impact = {account['id']: 0 for account in state['accounts']}
    for item in state['transactions']:
        amount = Number(item.get('amount', 0))
        impact[item.get('accountId')] = impact.get(item.get('accountId'), 0) + (amount if item.get('type') == 'in' else -amount)
    return sum(float(account.get('opening', 0)) + impact.get(account['id'], 0) for account in state['accounts'])


def Number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0


def summary(chat_id, period):
    _, state = require_workspace(chat_id)
    if state is None:
        return
    today = date.today().isoformat()
    key = today if period == 'today' else today[:7]
    entries = [item for item in state['transactions'] if str(item.get('date', '')).startswith(key)]
    incoming = sum(Number(item['amount']) for item in entries if item.get('type') == 'in')
    outgoing = sum(Number(item['amount']) for item in entries if item.get('type') == 'out')
    send(chat_id, f"📊 {period.title()}\nMoney In: {format_money(incoming)}\nMoney Out: {format_money(outgoing)}\nNet: {format_money(incoming - outgoing)}")


def start_entry(chat_id, entry_type, state):
    if not state['accounts']:
        return send(chat_id, 'Add an account on the website before recording money.')
    SESSIONS[chat_id] = {'type': entry_type}
    buttons = [[{'text': account['name'], 'callback_data': f"account:{account['id']}"}] for account in state['accounts']]
    send(chat_id, 'Choose an account:', buttons)


def choose_category(chat_id, account_id):
    SESSIONS[chat_id]['accountId'] = account_id
    buttons = [[{'text': name, 'callback_data': f'category:{index}'} for index, name in enumerate(CATEGORIES[i:i + 2], i)] for i in range(0, len(CATEGORIES), 2)]
    send(chat_id, 'Choose a category:', buttons)


def save_amount(chat_id, text):
    user_id, state = require_workspace(chat_id)
    session = SESSIONS.get(chat_id)
    try:
        amount = float(text.replace(',', '').strip())
    except ValueError:
        return send(chat_id, 'Enter a number, for example: 50000')
    if amount <= 0:
        return send(chat_id, 'The amount must be greater than zero.')
    entry = {
        'id': str(uuid.uuid4()), 'type': session['type'], 'accountId': session['accountId'],
        'amount': amount, 'date': date.today().isoformat(), 'category': session['category'],
        'note': 'Added from Telegram'
    }
    state['transactions'].append(entry)
    save_state(user_id, state)
    SESSIONS.pop(chat_id, None)
    send(chat_id, f"Saved {'Money In' if entry['type'] == 'in' else 'Money Out'}: {format_money(amount)}")
    menu(chat_id)


def handle_message(message):
    chat_id = message['chat']['id']
    text = message.get('text', '').strip()
    if text.startswith('/connect '):
        code = text.split(maxsplit=1)[1].upper()
        send(chat_id, 'Connected successfully.' if connect_telegram_chat(code, chat_id) else 'That code is invalid or expired.')
        return menu(chat_id) if user_id_for_chat(chat_id) else None
    if text in ('/start', '/menu'):
        return menu(chat_id)
    if chat_id in SESSIONS and 'category' in SESSIONS[chat_id]:
        return save_amount(chat_id, text)
    menu(chat_id)


def handle_callback(callback):
    answer(callback['id'])
    chat_id = callback['message']['chat']['id']
    action = callback['data']
    _, state = require_workspace(chat_id)
    if state is None:
        return
    if action in ('menu:in', 'menu:out'):
        return start_entry(chat_id, action.split(':')[1], state)
    if action == 'menu:balance':
        return send(chat_id, f'💳 Total balance: {format_money(total_balance(state))}')
    if action == 'menu:today':
        return summary(chat_id, 'today')
    if action == 'menu:month':
        return summary(chat_id, 'month')
    if action.startswith('account:'):
        return choose_category(chat_id, action.split(':', 1)[1])
    if action.startswith('category:'):
        session = SESSIONS.get(chat_id)
        if not session:
            return menu(chat_id)
        session['category'] = CATEGORIES[int(action.split(':')[1])]
        return send(chat_id, 'Enter the amount in VND, for example: 50000')


def run():
    if not TOKEN:
        raise SystemExit('Set TELEGRAM_BOT_TOKEN before starting the bot.')
    initialize()
    offset = 0
    while True:
        try:
            updates = telegram('getUpdates', offset=offset, timeout=30)
            for update in updates:
                offset = update['update_id'] + 1
                if 'message' in update:
                    handle_message(update['message'])
                elif 'callback_query' in update:
                    handle_callback(update['callback_query'])
        except Exception as error:
            print('Telegram polling error:', error, flush=True)
            time.sleep(3)


if __name__ == '__main__':
    run()
