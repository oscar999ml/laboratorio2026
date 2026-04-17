import sounddevice as sd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import customtkinter as ctk
from threading import Thread
import time

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class AudioCaptureApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("Audio Capture System")
        self.geometry("900x600")
        
        self.running = False
        self.stream = None
        self.audio_data = []
        self.max_points = 500
        
        self.setup_ui()
        self.refresh_devices()
    
    def setup_ui(self):
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        left_frame = ctk.CTkFrame(self, width=250)
        left_frame.grid(row=0, column=0, padx=10, pady=10, sticky="ns")
        left_frame.grid_propagate(False)
        
        ctk.CTkLabel(left_frame, text="Micrófonos", font=("Arial", 16, "bold")).pack(pady=10)
        
        self.device_listbox = ctk.CTkTextbox(left_frame, height=300)
        self.device_listbox.pack(padx=10, pady=5, fill="both", expand=True)
        
        ctk.CTkButton(left_frame, text="Actualizar", command=self.refresh_devices).pack(pady=5)
        
        self.start_btn = ctk.CTkButton(left_frame, text="Iniciar Captura", 
                                        command=self.toggle_capture,
                                        fg_color="green", height=40)
        self.start_btn.pack(pady=10, padx=10, fill="x")
        
        right_frame = ctk.CTkFrame(self)
        right_frame.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        ctk.CTkLabel(right_frame, text="Forma de Onda", font=("Arial", 14, "bold")).pack(pady=5)
        
        self.fig, self.ax = plt.subplots(figsize=(8, 3), facecolor='#2b2b2b')
        self.ax.set_facecolor('#2b2b2b')
        self.ax.set_xlim(0, self.max_points)
        self.ax.set_ylim(-1, 1)
        self.ax.set_title("", color='white')
        self.ax.tick_params(colors='white')
        for spine in self.ax.spines.values():
            spine.set_color('#2b2b2b')
        self.line, = self.ax.plot([], [], color='#00d4ff', linewidth=1)
        
        self.canvas = FigureCanvasTkAgg(self.fig, master=right_frame)
        self.canvas.get_tk_widget().pack(fill="both", expand=True)
        
        meter_frame = ctk.CTkFrame(right_frame, height=30)
        meter_frame.pack(fill="x", pady=5)
        
        ctk.CTkLabel(meter_frame, text="Volumen:").pack(side="left", padx=10)
        
        self.volume_bar = ctk.CTkProgressBar(meter_frame, progress_color="green")
        self.volume_bar.set(0)
        self.volume_bar.pack(side="left", fill="x", expand=True, padx=10)
        
        self.volume_label = ctk.CTkLabel(meter_frame, text="0.00")
        self.volume_label.pack(side="left", padx=10)
        
        info_frame = ctk.CTkFrame(right_frame, height=30)
        info_frame.pack(fill="x", pady=5)
        
        self.status_label = ctk.CTkLabel(info_frame, text="Listo", text_color="gray")
        self.status_label.pack(side="left", padx=10)
        
        self.sample_rate_label = ctk.CTkLabel(info_frame, text="44100 Hz")
        self.sample_rate_label.pack(side="right", padx=10)
    
    def refresh_devices(self):
        devices = sd.query_devices()
        self.device_listbox.delete("1.0", "end")
        self.input_devices = []
        
        for i, dev in enumerate(devices):
            if dev['max_input_channels'] > 0:
                self.input_devices.append(i)
                self.device_listbox.insert("end", f"[{i}] {dev['name']}\n")
        
        if self.input_devices:
            default = sd.query_devices(kind='input')
            self.device_listbox.insert("end", f"\nPredeterminado: {default['name']}")
    
    def toggle_capture(self):
        if self.running:
            self.stop_capture()
        else:
            self.start_capture()
    
    def start_capture(self):
        selected = self.device_listbox.get("1.0", "end-1c")
        lines = selected.split('\n')
        device_idx = None
        
        for line in lines:
            if line.startswith('[') and ']' in line:
                try:
                    device_idx = int(line.split('[')[1].split(']')[0])
                    break
                except:
                    pass
        
        if device_idx is None and self.input_devices:
            device_idx = self.input_devices[0]
        
        try:
            self.stream = sd.InputStream(
                device=device_idx,
                channels=1,
                samplerate=44100,
                blocksize=512,
                callback=self.audio_callback
            )
            self.stream.start()
            self.running = True
            self.start_btn.configure(text="Detener", fg_color="red")
            self.status_label.configure(text="Capturando...", text_color="green")
        except Exception as e:
            self.status_label.configure(text=f"Error: {e}", text_color="red")
    
    def stop_capture(self):
        self.running = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        self.start_btn.configure(text="Iniciar Captura", fg_color="green")
        self.status_label.configure(text="Detenido", text_color="gray")
    
    def audio_callback(self, indata, frames, time, status):
        if status:
            print(f"Status: {status}")
        
        audio = indata[:, 0]
        
        self.audio_data.extend(audio.tolist())
        if len(self.audio_data) > self.max_points:
            self.audio_data = self.audio_data[-self.max_points:]
        
        volume = np.abs(audio).mean()
        
        self.after(10, self.update_plot, volume)
    
    def update_plot(self, volume):
        if self.audio_data:
            self.line.set_data(range(len(self.audio_data)), self.audio_data)
            self.ax.set_xlim(0, max(self.max_points, len(self.audio_data)))
            self.canvas.draw()
        
        self.volume_bar.set(min(volume * 10, 1))
        self.volume_label.configure(text=f"{volume:.4f}")
        
        if volume > 0.1:
            self.volume_bar.configure(progress_color="red")
        elif volume > 0.05:
            self.volume_bar.configure(progress_color="yellow")
        else:
            self.volume_bar.configure(progress_color="green")

if __name__ == "__main__":
    app = AudioCaptureApp()
    app.mainloop()