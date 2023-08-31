import http.server
import os
import webbrowser

class FileServer(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        root_directory = '.'  # The directory from which to serve files
        
        if self.path == "/":
            self.path = "/index.html"
        
        file_path = os.path.join(root_directory, self.path[1:])  # Remove the leading '/'
        
        # Check if the requested path is a file and exists
        if os.path.isfile(file_path):
            # Determine the Content-type based on the file extension
            content_type = 'text/plain'
            if file_path.endswith('.html'):
                content_type = 'text/html'
            elif file_path.endswith('.js'):
                content_type = 'text/javascript'
            elif file_path.endswith('.css'):
                content_type = 'text/css'
            
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.end_headers()
            
            # Open and send the requested file
            with open(file_path, 'rb') as file:
                self.wfile.write(file.read())
        else:
            self.send_response(404)  # File not found
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'File not found')

if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = http.server.HTTPServer(server_address, FileServer)
    print('Server running on http://localhost:8000/')
    
    # Open the index.html file in the default web browser
    index_url = 'http://localhost:8000/index.html'
    webbrowser.open(index_url)
    
    httpd.serve_forever()

