import json
import re
import sqlite3
import time
from http.server import SimpleHTTPRequestHandler
from urllib.parse import urlparse

from database import storage
from .auth import new_link_code, new_password_record, new_token, password_matches
from .config import FRONTEND_ROOT, MAX_REQUEST_BYTES, SESSION_SECONDS


class SpendwiseHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_ROOT), **kwargs)

    def log_message(self, message, *args):
        if not self.path.startswith('/api/'):
            super().log_message(message, *args)

    def json_response(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def json_body(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > MAX_REQUEST_BYTES:
                return None
            return json.loads(self.rfile.read(length))
        except (ValueError, json.JSONDecodeError):
            return None

    def bearer_token(self):
        header = self.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return None
        token = header[7:]
        return token if re.fullmatch(r'[A-Za-z0-9_-]{20,200}', token) else None

    def current_user(self):
        token = self.bearer_token()
        return storage.user_for_token(token) if token else None

    def require_user(self):
        user = self.current_user()
        if not user:
            self.json_response(401, {'error': 'Sign in required'})
        return user

    def issue_session(self, user):
        token = new_token()
        storage.save_session(token, user['id'], int(time.time()) + SESSION_SECONDS)
        public_user = {key: user[key] for key in ('id', 'name', 'email')}
        self.json_response(200, {'token': token, 'user': public_user})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/':
            self.send_response(302)
            self.send_header('Location', '/welcome.html')
            self.end_headers()
            return
        if path == '/api/me':
            user = self.require_user()
            if user:
                self.json_response(200, {'user': user})
            return
        if path == '/api/state':
            user = self.require_user()
            if user:
                self.json_response(200, {'state': storage.load_state(user['id'])})
            return
        if path.startswith('/api/'):
            self.json_response(404, {'error': 'API route not found'})
            return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/api/register':
            return self.register()
        if path == '/api/login':
            return self.login()
        if path == '/api/logout':
            token = self.bearer_token()
            if token:
                storage.delete_session(token)
            return self.json_response(200, {'ok': True})
        if path == '/api/telegram-link':
            user = self.require_user()
            if not user:
                return
            code = new_link_code()
            storage.save_link_code(code, user['id'], int(time.time()) + 600)
            return self.json_response(200, {'code': code, 'expiresInSeconds': 600})
        self.json_response(404, {'error': 'API route not found'})

    def do_PUT(self):
        if urlparse(self.path).path != '/api/state':
            return self.json_response(404, {'error': 'API route not found'})
        user = self.require_user()
        if not user:
            return
        state = self.json_body()
        required_lists = ('accounts', 'transactions')
        if not isinstance(state, dict) or not all(isinstance(state.get(key), list) for key in required_lists):
            return self.json_response(400, {'error': 'Invalid workspace data'})
        storage.save_state(user['id'], state)
        self.json_response(200, {'ok': True})

    def register(self):
        body = self.json_body()
        if not isinstance(body, dict):
            return self.json_response(400, {'error': 'Invalid request'})
        name = str(body.get('name', '')).strip()[:80]
        email = str(body.get('email', '')).strip().lower()
        password = str(body.get('password', ''))
        if not name or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) or len(password) < 8:
            return self.json_response(400, {'error': 'Enter a name, valid email, and password of at least 8 characters'})
        salt, password_hash = new_password_record(password)
        try:
            user = storage.create_user(name, email, salt, password_hash)
        except sqlite3.IntegrityError:
            return self.json_response(409, {'error': 'An account with that email already exists'})
        self.issue_session(user)

    def login(self):
        body = self.json_body()
        if not isinstance(body, dict):
            return self.json_response(400, {'error': 'Invalid request'})
        user = storage.find_user_by_email(str(body.get('email', '')).strip().lower())
        password = str(body.get('password', ''))
        if not user or not password_matches(password, user['salt'], user['password_hash']):
            return self.json_response(401, {'error': 'Incorrect email or password'})
        self.issue_session(user)
