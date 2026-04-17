import numpy as np

class PitchDetector:
    def __init__(self, sample_rate=44100, min_freq=80, max_freq=1000):
        self.sample_rate = sample_rate
        self.min_freq = min_freq
        self.max_freq = max_freq
        
    def detect_autocorrelation(self, audio):
        if len(audio) < self.sample_rate // 10:
            return 0
        
        audio = audio - np.mean(audio)
        
        min_lag = self.sample_rate // self.max_freq
        max_lag = self.sample_rate // self.min_freq
        
        correlation = np.correlate(audio, audio, mode='full')
        correlation = correlation[len(correlation) // 2:]
        
        if max_lag >= len(correlation):
            max_lag = len(correlation) - 1
        if min_lag >= max_lag:
            return 0
            
        correlation = correlation[min_lag:max_lag]
        
        if len(correlation) == 0 or np.max(correlation) <= 0:
            return 0
            
        correlation = correlation / np.max(correlation)
        
        peak_idx = np.argmax(correlation)
        peak_val = correlation[peak_idx]
        
        if peak_val < 0.3:
            return 0
        
        if peak_idx > 0 and peak_idx < len(correlation) - 1:
            y1, y2, y3 = correlation[peak_idx - 1], correlation[peak_idx], correlation[peak_idx + 1]
            a = (y1 + y3 - 2 * y2) / 2
            b = (y3 - y1) / 2
            if a != 0:
                refined_peak = peak_idx + b / (2 * a)
            else:
                refined_peak = peak_idx
        else:
            refined_peak = peak_idx
        
        frequency = self.sample_rate / (min_lag + refined_peak)
        
        return frequency
    
    def detect_yin(self, audio):
        if len(audio) < 2048:
            return 0
            
        audio = audio - np.mean(audio)
        
        buffer_size = len(audio)
        yin_buffer = np.zeros(buffer_size // 2)
        
        min_lag = self.sample_rate // self.max_freq
        max_lag = self.sample_rate // self.min_freq
        
        for tau in range(min_lag, min(buffer_size // 2, max_lag)):
            delta = audio[:buffer_size - tau] - audio[tau:]
            yin_buffer[tau] = np.sum(delta ** 2)
        
        yin_buffer[:min_lag] = yin_buffer[min_lag]
        
        cumulative = np.zeros(buffer_size // 2)
        cumulative[0] = yin_buffer[0]
        for i in range(1, len(cumulative)):
            cumulative[i] = cumulative[i - 1] + yin_buffer[i]
        
        threshold = 0.1
        tau = min_lag
        while tau < len(yin_buffer):
            if yin_buffer[tau] < threshold * cumulative[tau] / tau:
                while tau + 1 < len(yin_buffer) and yin_buffer[tau + 1] < yin_buffer[tau]:
                    tau += 1
                break
            tau += 1
        
        if tau >= len(yin_buffer):
            return 0
            
        better_tau = tau
        if better_tau > 0 and better_tau < len(yin_buffer) - 1:
            x0 = yin_buffer[better_tau - 1]
            x1 = yin_buffer[better_tau]
            x2 = yin_buffer[better_tau + 1]
            if x1 != 0:
                tau = better_tau + (x0 - x2) / (2 * (x0 - 2 * x1 + x2))
        
        if tau < min_lag or tau >= max_lag:
            return 0
            
        frequency = self.sample_rate / tau
        
        return frequency
    
    def detect(self, audio, method='autocorrelation'):
        if method == 'yin':
            return self.detect_yin(audio)
        return self.detect_autocorrelation(audio)
    
    def detect_smooth(self, audio_history, smoothing=0.5):
        if len(audio_history) < 2:
            return self.detect(audio_history[-1])
        
        freq = self.detect(audio_history[-1])
        
        if freq > 0:
            prev_freqs = [self.detect(seg) for seg in audio_history[:-1] if self.detect(seg) > 0]
            if prev_freqs:
                prev_freq = np.mean(prev_freqs)
                freq = prev_freq + smoothing * (freq - prev_freq)
        
        return freq