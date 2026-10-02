import json
import sqlite3
import time
from contextlib import contextmanager

from api.auth import token_digest
from api.config import DATABASE_PATH


@contextmanager
def connect():
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as database:
        database.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                salt BLOB NOT NULL,
                password_hash BLOB NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS states (
                user_id INTEGER PRIMARY KEY,
                state_json TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
        ''')


def find_user_by_email(email):
    with connect() as database:
        row = database.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    return dict(row) if row else None


def create_user(name, email, salt, password_hash):
    with connect() as database:
        cursor = database.execute(
            'INSERT INTO users(name, email, salt, password_hash) VALUES (?, ?, ?, ?)',
            (name, email, salt, password_hash)
        )
    return {'id': cursor.lastrowid, 'name': name, 'email': email}


def save_session(token, user_id, expires_at):
    with connect() as database:
        database.execute('DELETE FROM sessions WHERE expires_at <= ?', (int(time.time()),))
        database.execute(
            'INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)',
            (token_digest(token), user_id, expires_at)
        )


def delete_session(token):
    with connect() as database:
        database.execute('DELETE FROM sessions WHERE token_hash = ?', (token_digest(token),))


def user_for_token(token):
    with connect() as database:
        row = database.execute('''
            SELECT users.id, users.name, users.email
            FROM sessions JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
        ''', (token_digest(token), int(time.time()))).fetchone()
    return dict(row) if row else None


def load_state(user_id):
    with connect() as database:
        row = database.execute('SELECT state_json FROM states WHERE user_id = ?', (user_id,)).fetchone()
    return json.loads(row['state_json']) if row else None


def save_state(user_id, state):
    with connect() as database:
        database.execute('''
            INSERT INTO states(user_id, state_json) VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json
        ''', (user_id, json.dumps(state, ensure_ascii=False)))
