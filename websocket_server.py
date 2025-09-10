#!/usr/bin/env python3
import socket
import threading
import json
import hashlib
import base64
import struct
from datetime import datetime
import uuid
import re

# Store active connections and rooms
connections = {}
rooms = {}

class Room:
    def __init__(self, room_id):
        self.room_id = room_id
        self.participants = {}
        self.messages = []
        self.created_at = datetime.now()
    
    def add_participant(self, user_id, connection):
        self.participants[user_id] = {
            'connection': connection,
            'joined_at': datetime.now()
        }
    
    def remove_participant(self, user_id):
        if user_id in self.participants:
            del self.participants[user_id]
    
    def add_message(self, message):
        self.messages.append({
            **message,
            'timestamp': datetime.now().isoformat()
        })
    
    def broadcast(self, message, exclude_user=None):
        if not self.participants:
            return
        
        disconnected = []
        for user_id, participant in self.participants.items():
            if exclude_user and user_id == exclude_user:
                continue
            
            try:
                send_websocket_message(participant['connection'], json.dumps(message))
            except Exception as e:
                print(f"Error broadcasting to {user_id}: {e}")
                disconnected.append(user_id)
        
        # Remove disconnected participants
        for user_id in disconnected:
            self.remove_participant(user_id)

def websocket_handshake(client_socket, request):
    """Perform WebSocket handshake"""
    # Extract the WebSocket key
    key_match = re.search(r'Sec-WebSocket-Key: (.+)', request)
    if not key_match:
        return False
    
    websocket_key = key_match.group(1).strip()
    
    # Create the accept key
    magic_string = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
    accept_key = base64.b64encode(
        hashlib.sha1((websocket_key + magic_string).encode()).digest()
    ).decode()
    
    # Send handshake response
    response = (
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Accept: {accept_key}\r\n"
        "\r\n"
    )
    
    client_socket.send(response.encode())
    return True

def decode_websocket_frame(data):
    """Decode a WebSocket frame"""
    if len(data) < 2:
        return None
    
    byte1, byte2 = data[0], data[1]
    
    # Check if this is a text frame
    opcode = byte1 & 0x0F
    if opcode != 1:  # Text frame
        return None
    
    # Get payload length
    payload_length = byte2 & 0x7F
    mask_bit = byte2 & 0x80
    
    offset = 2
    
    if payload_length == 126:
        payload_length = struct.unpack(">H", data[offset:offset+2])[0]
        offset += 2
    elif payload_length == 127:
        payload_length = struct.unpack(">Q", data[offset:offset+8])[0]
        offset += 8
    
    # Extract mask if present
    if mask_bit:
        mask = data[offset:offset+4]
        offset += 4
        payload = data[offset:offset+payload_length]
        
        # Unmask the payload
        unmasked = bytearray()
        for i in range(len(payload)):
            unmasked.append(payload[i] ^ mask[i % 4])
        
        return unmasked.decode('utf-8')
    else:
        return data[offset:offset+payload_length].decode('utf-8')

def encode_websocket_frame(message):
    """Encode a message as a WebSocket frame"""
    message_bytes = message.encode('utf-8')
    length = len(message_bytes)
    
    # Create frame
    frame = bytearray()
    frame.append(0x81)  # FIN=1, opcode=1 (text)
    
    if length < 126:
        frame.append(length)
    elif length < 65536:
        frame.append(126)
        frame.extend(struct.pack(">H", length))
    else:
        frame.append(127)
        frame.extend(struct.pack(">Q", length))
    
    frame.extend(message_bytes)
    return bytes(frame)

def send_websocket_message(client_socket, message):
    """Send a WebSocket message"""
    frame = encode_websocket_frame(message)
    client_socket.send(frame)

def handle_message(client_id, client_socket, data):
    """Handle incoming WebSocket message"""
    try:
        message = json.loads(data)
        message_type = message.get('type')
        
        if message_type == 'join_room':
            room_id = message.get('room_id')
            user_id = message.get('user_id', client_id)
            
            if not room_id:
                send_websocket_message(client_socket, json.dumps({
                    'type': 'error',
                    'message': 'Room ID is required'
                }))
                return
            
            # Create room if it doesn't exist
            if room_id not in rooms:
                rooms[room_id] = Room(room_id)
            
            room = rooms[room_id]
            room.add_participant(user_id, client_socket)
            
            # Send confirmation to the user
            send_websocket_message(client_socket, json.dumps({
                'type': 'room_joined',
                'room_id': room_id,
                'user_id': user_id,
                'participants': list(room.participants.keys()),
                'messages': room.messages[-50:]  # Send last 50 messages
            }))
            
            # Notify other participants
            room.broadcast({
                'type': 'user_joined',
                'user_id': user_id,
                'room_id': room_id
            }, exclude_user=user_id)
            
            print(f"User {user_id} joined room {room_id}")
        
        elif message_type == 'send_message':
            room_id = message.get('room_id')
            user_id = message.get('user_id', client_id)
            message_text = message.get('message', '')
            translation = message.get('translation', '')
            
            if room_id not in rooms:
                send_websocket_message(client_socket, json.dumps({
                    'type': 'error',
                    'message': 'Room not found'
                }))
                return
            
            room = rooms[room_id]
            
            msg = {
                'type': 'new_message',
                'room_id': room_id,
                'user_id': user_id,
                'message': message_text,
                'translation': translation,
                'timestamp': datetime.now().isoformat()
            }
            
            room.add_message(msg)
            room.broadcast(msg)
            
            print(f"Message from {user_id} in room {room_id}: {message_text}")
        
        elif message_type == 'send_voice':
            room_id = message.get('room_id')
            user_id = message.get('user_id', client_id)
            voice_data = message.get('voice_data')
            transcript = message.get('transcript', '')
            translation = message.get('translation', '')
            
            if room_id not in rooms:
                send_websocket_message(client_socket, json.dumps({
                    'type': 'error',
                    'message': 'Room not found'
                }))
                return
            
            room = rooms[room_id]
            
            voice_message = {
                'type': 'voice_message',
                'room_id': room_id,
                'user_id': user_id,
                'voice_data': voice_data,
                'transcript': transcript,
                'translation': translation,
                'timestamp': datetime.now().isoformat()
            }
            
            room.add_message(voice_message)
            room.broadcast(voice_message)
            
            print(f"Voice message from {user_id} in room {room_id}: {transcript}")
        
        else:
            send_websocket_message(client_socket, json.dumps({
                'type': 'error',
                'message': f'Unknown message type: {message_type}'
            }))
    
    except json.JSONDecodeError:
        send_websocket_message(client_socket, json.dumps({
            'type': 'error',
            'message': 'Invalid JSON format'
        }))
    except Exception as e:
        print(f"Error handling message: {e}")
        send_websocket_message(client_socket, json.dumps({
            'type': 'error',
            'message': 'Internal server error'
        }))

def handle_client(client_socket, address):
    """Handle a client connection"""
    client_id = str(uuid.uuid4())
    connections[client_id] = client_socket
    print(f"Client {client_id} connected from {address}")
    
    try:
        # Read the HTTP request
        request = client_socket.recv(4096).decode('utf-8')
        
        # Perform WebSocket handshake
        if not websocket_handshake(client_socket, request):
            print(f"WebSocket handshake failed for {client_id}")
            return
        
        print(f"WebSocket handshake successful for {client_id}")
        
        # Handle WebSocket messages
        while True:
            try:
                data = client_socket.recv(4096)
                if not data:
                    break
                
                message = decode_websocket_frame(data)
                if message:
                    handle_message(client_id, client_socket, message)
            
            except Exception as e:
                print(f"Error receiving data from {client_id}: {e}")
                break
    
    except Exception as e:
        print(f"Error handling client {client_id}: {e}")
    
    finally:
        # Clean up
        if client_id in connections:
            del connections[client_id]
        
        # Remove from all rooms
        for room in rooms.values():
            if client_id in room.participants:
                room.remove_participant(client_id)
                room.broadcast({
                    'type': 'user_left',
                    'user_id': client_id
                })
        
        client_socket.close()
        print(f"Client {client_id} disconnected")

def main():
    """Main server function"""
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server_socket.bind(('localhost', 3000))
        server_socket.listen(5)
        print("WebSocket server is running on ws://localhost:3000")
        
        while True:
            client_socket, address = server_socket.accept()
            client_thread = threading.Thread(
                target=handle_client,
                args=(client_socket, address)
            )
            client_thread.daemon = True
            client_thread.start()
    
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Server error: {e}")
    finally:
        server_socket.close()

if __name__ == "__main__":
    main()