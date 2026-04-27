import os
import sys

import customtkinter as ctk
import matplotlib.pyplot as plt
import numpy as np
import sounddevice as sd
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import AudioIOConfig, PitchConfig
from core.pipeline import PitchProcessingPipeline

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("green")


class AudioCaptureApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Audio Capture Pro")
        self.geometry("1180x740")
        self.minsize(980, 640)

        self.running = False
        self.stream = None
        self.audio_data = []
        self.max_points = 1400
        self.input_devices = []
        self.last_pitch = 0.0
        self.last_note = "-"

        self.io_config = AudioIOConfig(sample_rate=44100, channels=1, block_size=1024)
        self.pitch_config = PitchConfig()
        self.pipeline = PitchProcessingPipeline(io_config=self.io_config, pitch_config=self.pitch_config)

        self._build_layout()
        self.refresh_devices()

    def _build_layout(self):
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        controls = ctk.CTkFrame(self, width=320, corner_radius=14)
        controls.grid(row=0, column=0, padx=14, pady=14, sticky="ns")
        controls.grid_propagate(False)

        ctk.CTkLabel(controls, text="Audio Capture Pro", font=("Segoe UI", 22, "bold")).pack(
            padx=14, pady=(14, 6), anchor="w"
        )
        ctk.CTkLabel(
            controls,
            text="Pipeline modular, listo para crecer a API/SaaS",
            text_color="#9ca3af",
            font=("Segoe UI", 12),
        ).pack(padx=14, pady=(0, 14), anchor="w")

        self.device_listbox = ctk.CTkTextbox(controls, height=150)
        self.device_listbox.pack(padx=14, pady=(0, 8), fill="x")

        row = ctk.CTkFrame(controls, fg_color="transparent")
        row.pack(fill="x", padx=14, pady=(0, 8))
        ctk.CTkButton(row, text="Actualizar Dispositivos", command=self.refresh_devices).pack(fill="x")

        self.start_btn = ctk.CTkButton(
            controls,
            text="Iniciar Monitoreo",
            command=self.toggle_capture,
            fg_color="#047857",
            hover_color="#065f46",
            height=42,
        )
        self.start_btn.pack(padx=14, pady=(2, 14), fill="x")

        ctk.CTkLabel(controls, text="Metodo de Pitch", font=("Segoe UI", 13, "bold")).pack(
            padx=14, pady=(0, 4), anchor="w"
        )
        self.method_var = ctk.StringVar(value="autocorrelation")
        ctk.CTkSegmentedButton(
            controls,
            values=["autocorrelation", "yin"],
            variable=self.method_var,
            command=lambda _: self.update_config(),
        ).pack(padx=14, pady=(0, 10), fill="x")

        self.strength_slider = ctk.CTkSlider(controls, from_=0.0, to=1.0, number_of_steps=100, command=lambda _: self.update_config())
        self.strength_slider.set(0.8)
        self._labeled_slider(controls, "Strength", self.strength_slider)

        self.drywet_slider = ctk.CTkSlider(controls, from_=0.0, to=1.0, number_of_steps=100, command=lambda _: self.update_config())
        self.drywet_slider.set(1.0)
        self._labeled_slider(controls, "Dry/Wet", self.drywet_slider)

        self.smooth_slider = ctk.CTkSlider(controls, from_=0.0, to=0.95, number_of_steps=95, command=lambda _: self.update_config())
        self.smooth_slider.set(0.3)
        self._labeled_slider(controls, "Smoothing", self.smooth_slider)

        key_row = ctk.CTkFrame(controls, fg_color="transparent")
        key_row.pack(fill="x", padx=14, pady=(4, 6))
        ctk.CTkLabel(key_row, text="Key Lock", width=70).pack(side="left")
        self.key_var = ctk.StringVar(value="AUTO")
        self.key_menu = ctk.CTkOptionMenu(
            key_row,
            values=["AUTO", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
            variable=self.key_var,
            command=lambda _: self.update_config(),
        )
        self.key_menu.pack(side="left", padx=(8, 8), fill="x", expand=True)

        self.octave_var = ctk.StringVar(value="4")
        ctk.CTkOptionMenu(
            key_row,
            values=["2", "3", "4", "5", "6"],
            variable=self.octave_var,
            command=lambda _: self.update_config(),
            width=70,
        ).pack(side="right")

        stats = ctk.CTkFrame(controls)
        stats.pack(fill="x", padx=14, pady=(8, 14))
        self.status_label = ctk.CTkLabel(stats, text="Estado: Listo", anchor="w")
        self.status_label.pack(fill="x", padx=10, pady=(8, 4))
        self.pitch_label = ctk.CTkLabel(stats, text="Pitch: -", anchor="w")
        self.pitch_label.pack(fill="x", padx=10, pady=2)
        self.note_label = ctk.CTkLabel(stats, text="Nota: -", anchor="w")
        self.note_label.pack(fill="x", padx=10, pady=(2, 8))

        viewport = ctk.CTkFrame(self, corner_radius=14)
        viewport.grid(row=0, column=1, padx=(0, 14), pady=14, sticky="nsew")
        viewport.grid_rowconfigure(1, weight=1)
        viewport.grid_columnconfigure(0, weight=1)

        title = ctk.CTkLabel(viewport, text="Monitor de Señal en Tiempo Real", font=("Segoe UI", 18, "bold"))
        title.grid(row=0, column=0, sticky="w", padx=14, pady=(12, 6))

        self.fig, self.ax = plt.subplots(figsize=(10, 4), facecolor="#0f172a")
        self.ax.set_facecolor("#0b1222")
        self.ax.set_xlim(0, self.max_points)
        self.ax.set_ylim(-1, 1)
        self.ax.tick_params(colors="#cbd5e1")
        self.ax.spines["bottom"].set_color("#334155")
        self.ax.spines["left"].set_color("#334155")
        self.ax.spines["right"].set_visible(False)
        self.ax.spines["top"].set_visible(False)
        self.line, = self.ax.plot([], [], color="#22d3ee", linewidth=1.0)

        self.canvas = FigureCanvasTkAgg(self.fig, master=viewport)
        self.canvas.get_tk_widget().grid(row=1, column=0, sticky="nsew", padx=14, pady=(2, 10))

        meter = ctk.CTkFrame(viewport)
        meter.grid(row=2, column=0, sticky="ew", padx=14, pady=(0, 12))
        meter.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(meter, text="Nivel").grid(row=0, column=0, padx=10, pady=10)
        self.volume_bar = ctk.CTkProgressBar(meter)
        self.volume_bar.set(0)
        self.volume_bar.grid(row=0, column=1, sticky="ew", padx=10, pady=10)
        self.volume_label = ctk.CTkLabel(meter, text="0.0000")
        self.volume_label.grid(row=0, column=2, padx=10, pady=10)

    def _labeled_slider(self, parent, text, slider):
        row = ctk.CTkFrame(parent, fg_color="transparent")
        row.pack(fill="x", padx=14, pady=(2, 8))
        ctk.CTkLabel(row, text=text, width=80).pack(side="left")
        slider.pack(side="left", fill="x", expand=True, padx=(8, 0))

    def refresh_devices(self):
        devices = sd.query_devices()
        self.device_listbox.delete("1.0", "end")
        self.input_devices = []

        for i, dev in enumerate(devices):
            if dev["max_input_channels"] > 0:
                self.input_devices.append(i)
                self.device_listbox.insert("end", f"[{i}] {dev['name']}\n")

        if self.input_devices:
            default = sd.query_devices(kind="input")
            self.device_listbox.insert("end", f"\nPredeterminado: {default['name']}")

    def update_config(self):
        key = self.key_var.get()
        self.pitch_config.method = self.method_var.get()
        self.pitch_config.strength = float(self.strength_slider.get())
        self.pitch_config.dry_wet = float(self.drywet_slider.get())
        self.pitch_config.smoothing = float(self.smooth_slider.get())
        self.pitch_config.key_note = None if key == "AUTO" else key
        self.pitch_config.key_octave = int(self.octave_var.get())

    def toggle_capture(self):
        if self.running:
            self.stop_capture()
        else:
            self.start_capture()

    def start_capture(self):
        self.update_config()
        device_idx = self.input_devices[0] if self.input_devices else None

        try:
            self.stream = sd.InputStream(
                device=device_idx,
                channels=1,
                samplerate=self.io_config.sample_rate,
                blocksize=self.io_config.block_size,
                callback=self.audio_callback,
            )
            self.stream.start()
            self.running = True
            self.start_btn.configure(text="Detener Monitoreo", fg_color="#b91c1c", hover_color="#991b1b")
            self.status_label.configure(text="Estado: Capturando")
        except Exception as exc:
            self.status_label.configure(text=f"Estado: Error ({exc})")

    def stop_capture(self):
        self.running = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        self.start_btn.configure(text="Iniciar Monitoreo", fg_color="#047857", hover_color="#065f46")
        self.status_label.configure(text="Estado: Detenido")

    def audio_callback(self, indata, frames, callback_time, status):
        if status:
            self.status_label.configure(text=f"Estado: {status}")

        mono = indata[:, 0]
        processed, pitch, note = self.pipeline.process_chunk(mono)

        self.audio_data.extend(processed.tolist())
        if len(self.audio_data) > self.max_points:
            self.audio_data = self.audio_data[-self.max_points :]

        volume = float(np.mean(np.abs(mono)))
        self.last_pitch = pitch
        self.last_note = note

        self.after(5, self.update_plot, volume)

    def update_plot(self, volume):
        if self.audio_data:
            self.line.set_data(range(len(self.audio_data)), self.audio_data)
            self.ax.set_xlim(0, max(self.max_points, len(self.audio_data)))
            self.canvas.draw()

        self.volume_bar.set(min(volume * 8.0, 1.0))
        self.volume_label.configure(text=f"{volume:.4f}")

        if volume > 0.12:
            self.volume_bar.configure(progress_color="#ef4444")
        elif volume > 0.06:
            self.volume_bar.configure(progress_color="#f59e0b")
        else:
            self.volume_bar.configure(progress_color="#22c55e")

        if self.last_pitch > 0:
            self.pitch_label.configure(text=f"Pitch: {self.last_pitch:.2f} Hz")
            self.note_label.configure(text=f"Nota: {self.last_note}")
        else:
            self.pitch_label.configure(text="Pitch: -")
            self.note_label.configure(text="Nota: -")


if __name__ == "__main__":
    app = AudioCaptureApp()
    app.mainloop()
