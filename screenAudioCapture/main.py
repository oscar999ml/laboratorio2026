import mss
import cv2
import numpy as np
import time
from datetime import datetime
import os


def record_screen(output_file, fps=30, duration=None):
    print(f"Grabando pantalla en: {output_file}")
    print("Presiona Ctrl+C para detener")
    
    monitor_number = 1
    codec = cv2.VideoWriter_fourcc(*'mp4v')
    
    with mss.mss() as sct:
        monitor = sct.monitors[monitor_number]
        
        writer = cv2.VideoWriter(output_file, codec, fps, (monitor["width"], monitor["height"]))
        
        start_time = time.time()
        
        while True:
            img = sct.grab(monitor)
            frame = np.array(img)
            frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
            
            writer.write(frame)
            
            elapsed = time.time() - start_time
            print(f"\rGrabando... {int(elapsed)}s", end='', flush=True)
            
            if duration and elapsed >= duration:
                break
            
            time.sleep(1 / fps)
        
        writer.release()
        print(f"\nGrabacion guardada: {output_file}")


if __name__ == "__main__":
    output_dir = os.path.expanduser("~/Videos/Recordings")
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"recording_{timestamp}.mp4")
    
    record_screen(output_file, fps=30)
