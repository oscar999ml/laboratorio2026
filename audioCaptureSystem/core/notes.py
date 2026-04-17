import numpy as np

NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

NOTE_FREQUENCIES = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
    'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
    'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
}

def hz_to_note(frequency):
    if frequency <= 0:
        return None, None
    
    note_num = 12 * np.log2(frequency / 440.0) + 69
    note_num = int(round(note_num))
    
    note = NOTES[note_num % 12]
    octave = note_num // 12 - 1
    
    return note, octave

def note_to_hz(note, octave):
    note_idx = NOTES.index(note.replace('#', '#'))
    note_num = note_idx + (octave + 1) * 12
    frequency = 440.0 * 2 ** ((note_num - 69) / 12.0)
    return frequency

def find_nearest_note(frequency):
    if frequency <= 0:
        return None, None, None
    
    note, octave = hz_to_note(frequency)
    if note is None:
        return None, None, None
    
    target_hz = note_to_hz(note, octave)
    cents = 1200 * np.log2(frequency / target_hz) if target_hz > 0 else 0
    
    return note, octave, cents

def get_all_note_frequencies():
    frequencies = {}
    for octave in range(1, 9):
        for note in NOTES:
            freq = note_to_hz(note, octave)
            frequencies[f"{note}{octave}"] = freq
    return frequencies