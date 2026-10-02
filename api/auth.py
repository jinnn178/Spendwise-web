import hashlib
import hmac
import secrets


def hash_password(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 250_000)


def new_password_record(password):
    salt = secrets.token_bytes(16)
    return salt, hash_password(password, salt)


def password_matches(password, salt, expected_hash):
    return hmac.compare_digest(hash_password(password, salt), expected_hash)


def new_token():
    return secrets.token_urlsafe(32)


def token_digest(token):
    return hashlib.sha256(token.encode('ascii')).hexdigest()
