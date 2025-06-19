from flask import Flask, jsonify, send_from_directory, render_template
import json
import os

app = Flask(__name__, static_url_path='', static_folder='.')

# Load properties data
with open('data/properties.json', 'r') as f:
    properties = json.load(f)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/properties')
def get_all_properties():
    return jsonify(properties)

@app.route('/api/properties/<property_id>')
def get_property(property_id):
    property = next((p for p in properties if p['id'] == property_id), None)
    if property:
        return jsonify(property)
    return jsonify({'error': 'Property not found'}), 404

@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory('images', filename)

if __name__ == '__main__':
    app.run(port=5000, debug=True) 