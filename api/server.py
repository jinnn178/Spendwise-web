import os
import sys
from http.server import ThreadingHTTPServer

from .routes import SpendwiseHandler
from database.storage import initialize


def create_server(port=0, host='127.0.0.1'):
    initialize()
    return ThreadingHTTPServer((host, port), SpendwiseHandler)


def main():
    port = int(os.environ.get('PORT', sys.argv[1] if len(sys.argv) > 1 else 8000))
    host = os.environ.get('HOST', '0.0.0.0')
    server = create_server(port, host)
    print(f'Spendwise running on http://{host}:{server.server_port}', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
