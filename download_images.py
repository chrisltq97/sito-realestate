import os
import requests
from pathlib import Path

def download_image(url, filename):
    response = requests.get(url)
    if response.status_code == 200:
        with open(filename, 'wb') as f:
            f.write(response.content)
        print(f"Downloaded {filename}")
    else:
        print(f"Failed to download {filename}")

def main():
    # Create images directory if it doesn't exist
    Path("images").mkdir(exist_ok=True)
    
    # Sample property images from Picsum
    images = [
        ("https://picsum.photos/800/600?random=1", "property-1.jpg"),
        ("https://picsum.photos/800/600?random=2", "property-2.jpg"),
        ("https://picsum.photos/800/600?random=3", "property-3.jpg")
    ]
    
    for url, filename in images:
        download_image(url, os.path.join("images", filename))

if __name__ == "__main__":
    main() 