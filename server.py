from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add headers to prevent caching
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Add CORS headers
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        return super().do_GET()

if __name__ == '__main__':
    port = 8080
    # Change the working directory to backend/public
    os.chdir('backend/public')
    print(f"Serving from {os.getcwd()}")
    httpd = HTTPServer(('localhost', port), NoCacheHTTPRequestHandler)
    print(f"Server running at http://localhost:{port}/")
    httpd.serve_forever() 