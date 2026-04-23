import serial
import time
import threading
from decimal import Decimal


class GPSReader:
    def __init__(self, port="COM3", baudrate=9600, timeout=1):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial_connection = None
        self.running = False
        self.gps_thread = None
        
        self.latitude = 0.0
        self.longitude = 0.0
        self.altitude = 0.0
        self.speed = 0.0
        self.satellites = 0
        self.valid = False
        
        self.gps_data = {
            "latitude": 0.0,
            "longitude": 0.0,
            "altitude": 0.0,
            "speed": 0.0,
            "satellites": 0,
            "valid": False,
            "timestamp": None
        }

    def connect(self):
        try:
            self.serial_connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout
            )
            time.sleep(2)
            self.running = True
            self.gps_thread = threading.Thread(target=self._read_gps)
            self.gps_thread.daemon = True
            self.gps_thread.start()
            return True
        except serial.SerialException as e:
            print(f"Error al conectar con GPS: {e}")
            return False
        except FileNotFoundError:
            print(f"Puerto {self.port} no encontrado")
            return False

    def disconnect(self):
        self.running = False
        if self.gps_thread:
            self.gps_thread.join(timeout=2)
        if self.serial_connection and self.serial_connection.is_open:
            self.serial_connection.close()

    def _read_gps(self):
        while self.running:
            try:
                if self.serial_connection and self.serial_connection.in_waiting > 0:
                    line = self.serial_connection.readline().decode('utf-8', errors='ignore').strip()
                    self._parse_nmea(line)
                time.sleep(0.1)
            except Exception as e:
                print(f"Error leyendo GPS: {e}")
                time.sleep(1)

    def _parse_nmea(self, line):
        if line.startswith('$GPGGA') or line.startswith('$GNGGA'):
            self._parse_gga(line)
        elif line.startswith('$GPRMC') or line.startswith('$GNRMC'):
            self._parse_rmc(line)

    def _parse_gga(self, line):
        try:
            parts = line.split(',')
            if len(parts) < 15:
                return
            
            if parts[6] == '0':
                self.valid = False
                return
            
            self.valid = True
            
            lat_raw = parts[2]
            lat_dir = parts[3]
            lon_raw = parts[4]
            lon_dir = parts[5]
            
            if lat_raw and lon_raw:
                self.latitude = self._convert_coordinate(lat_raw, lat_dir)
                self.longitude = self._convert_coordinate(lon_raw, lon_dir)
            
            self.satellites = int(parts[7]) if parts[7] else 0
            
            if parts[9]:
                self.altitude = float(parts[9])
            
            self.gps_data = {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "altitude": self.altitude,
                "speed": self.speed,
                "satellites": self.satellites,
                "valid": self.valid,
                "timestamp": time.time()
            }
        except (IndexError, ValueError) as e:
            pass

    def _parse_rmc(self, line):
        try:
            parts = line.split(',')
            if len(parts) < 12:
                return
            
            if parts[2] != 'A':
                self.valid = False
                return
            
            self.valid = True
            
            lat_raw = parts[3]
            lat_dir = parts[4]
            lon_raw = parts[5]
            lon_dir = parts[6]
            
            if lat_raw and lon_raw:
                self.latitude = self._convert_coordinate(lat_raw, lat_dir)
                self.longitude = self._convert_coordinate(lon_raw, lon_dir)
            
            if parts[7]:
                speed_knots = float(parts[7])
                self.speed = speed_knots * 1.852
            
            self.gps_data = {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "altitude": self.altitude,
                "speed": self.speed,
                "satellites": self.satellites,
                "valid": self.valid,
                "timestamp": time.time()
            }
        except (IndexError, ValueError):
            pass

    def _convert_coordinate(self, raw, direction):
        if not raw or len(raw) < 4:
            return 0.0
        
        try:
            if '.' not in raw:
                return 0.0
            
            degrees = float(raw[:raw.index('.')-2])
            minutes = float(raw[raw.index('.')-2:])
            decimal = degrees + (minutes / 60)
            
            if direction in ['S', 'W']:
                decimal = -decimal
            
            return decimal
        except (ValueError, IndexError):
            return 0.0

    def get_location(self):
        return self.gps_data.copy()

    def is_valid(self):
        return self.valid and self.latitude != 0.0 and self.longitude != 0.0

    def get_coordinates_string(self):
        if self.is_valid():
            return f"{self.latitude:.6f}, {self.longitude:.6f}"
        return "GPS no disponible"