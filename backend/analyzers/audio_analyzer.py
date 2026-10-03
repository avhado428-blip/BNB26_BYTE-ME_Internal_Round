import io
import math

import numpy as np
import soundfile as sf


def safe_round(value, digits=3):
    if value is None:
        return None

    try:
        return round(float(value), digits)
    except (TypeError, ValueError):
        return None


def calculate_rms(samples: np.ndarray) -> float:
    if samples.size == 0:
        return 0.0

    return float(np.sqrt(np.mean(np.square(samples))))


def calculate_peak(samples: np.ndarray) -> float:
    if samples.size == 0:
        return 0.0

    return float(np.max(np.abs(samples)))


def calculate_zero_crossing_rate(samples: np.ndarray) -> float:
    if samples.size < 2:
        return 0.0

    signs = np.signbit(samples)

    return float(
        np.mean(signs[1:] != signs[:-1])
    )


def calculate_spectral_centroid(
    samples: np.ndarray,
    sample_rate: int,
) -> float:
    if samples.size == 0 or sample_rate <= 0:
        return 0.0

    if samples.ndim > 1:
        samples = np.mean(samples, axis=1)

    window = min(len(samples), 131072)

    samples = samples[:window]

    if len(samples) == 0:
        return 0.0

    spectrum = np.abs(
        np.fft.rfft(samples)
    )

    frequencies = np.fft.rfftfreq(
        len(samples),
        d=1.0 / sample_rate,
    )

    total_energy = np.sum(spectrum)

    if total_energy <= 0:
        return 0.0

    centroid = np.sum(
        frequencies * spectrum
    ) / total_energy

    return float(centroid)


def calculate_dynamic_range(
    samples: np.ndarray,
) -> float:
    if samples.size == 0:
        return 0.0

    absolute = np.abs(samples)

    non_zero = absolute[
        absolute > 1e-8
    ]

    if non_zero.size == 0:
        return 0.0

    high = np.percentile(
        non_zero,
        95,
    )

    low = np.percentile(
        non_zero,
        5,
    )

    if low <= 0:
        return 0.0

    return float(
        20.0 * math.log10(
            high / low
        )
    )


def calculate_synthetic_signal(
    rms: float,
    peak: float,
    zero_crossing_rate: float,
    spectral_centroid: float,
    sample_rate: int,
) -> float:
    signal = 50.0

    if peak > 0 and rms > 0:
        crest_factor = peak / rms

        if crest_factor < 1.2:
            signal += 15
        elif crest_factor > 8:
            signal += 5
        else:
            signal -= 5

    if zero_crossing_rate < 0.005:
        signal += 10
    elif zero_crossing_rate > 0.25:
        signal += 8
    else:
        signal -= 5

    if spectral_centroid > sample_rate * 0.35:
        signal += 8
    elif spectral_centroid < sample_rate * 0.02:
        signal += 5
    else:
        signal -= 4

    return max(
        0.0,
        min(100.0, signal),
    )


def analyze_audio(data: bytes) -> dict:
    observations = []

    try:
        audio_buffer = io.BytesIO(data)

        samples, sample_rate = sf.read(
            audio_buffer,
            dtype="float32",
            always_2d=False,
        )

        info_buffer = io.BytesIO(data)

        info = sf.info(
            info_buffer
        )

    except Exception as error:
        return {
            "valid_audio": False,
            "format": None,
            "subtype": None,
            "duration": None,
            "sample_rate": None,
            "channels": None,
            "frames": None,
            "rms": None,
            "peak": None,
            "zero_crossing_rate": None,
            "spectral_centroid": None,
            "dynamic_range": None,
            "synthetic_signal": None,
            "observations": [
                f"Audio decoding failed: {error}"
            ],
        }

    samples_array = np.asarray(
        samples,
        dtype=np.float32,
    )

    if samples_array.ndim > 1:
        analysis_samples = np.mean(
            samples_array,
            axis=1,
        )
    else:
        analysis_samples = samples_array

    rms = calculate_rms(
        analysis_samples
    )

    peak = calculate_peak(
        analysis_samples
    )

    zero_crossing_rate = (
        calculate_zero_crossing_rate(
            analysis_samples
        )
    )

    spectral_centroid = (
        calculate_spectral_centroid(
            analysis_samples,
            sample_rate,
        )
    )

    dynamic_range = (
        calculate_dynamic_range(
            analysis_samples
        )
    )

    synthetic_signal = (
        calculate_synthetic_signal(
            rms=rms,
            peak=peak,
            zero_crossing_rate=zero_crossing_rate,
            spectral_centroid=spectral_centroid,
            sample_rate=sample_rate,
        )
    )

    duration = (
        float(info.frames) / info.samplerate
        if info.samplerate
        else 0.0
    )

    if info.channels == 1:
        observations.append(
            "Audio is monophonic."
        )
    else:
        observations.append(
            f"Audio contains {info.channels} channels."
        )

    if duration < 1:
        observations.append(
            "Very short audio sample."
        )
    elif duration > 600:
        observations.append(
            "Long-form audio recording."
        )

    if peak >= 0.99:
        observations.append(
            "Signal contains near-full-scale peaks."
        )

    if dynamic_range < 10:
        observations.append(
            "Low dynamic range detected."
        )
    elif dynamic_range > 40:
        observations.append(
            "Wide dynamic range detected."
        )

    if synthetic_signal >= 70:
        observations.append(
            "Audio signal contains elevated synthetic/manipulation indicators."
        )
    elif synthetic_signal >= 40:
        observations.append(
            "Audio contains ambiguous signal characteristics requiring further analysis."
        )
    else:
        observations.append(
            "No strong synthetic signal detected by the current heuristic."
        )

    return {
        "valid_audio": True,
        "format": info.format,
        "subtype": info.subtype,
        "duration": safe_round(duration),
        "sample_rate": info.samplerate,
        "channels": info.channels,
        "frames": info.frames,
        "rms": safe_round(rms),
        "peak": safe_round(peak),
        "zero_crossing_rate": safe_round(
            zero_crossing_rate
        ),
        "spectral_centroid": safe_round(
            spectral_centroid
        ),
        "dynamic_range": safe_round(
            dynamic_range
        ),
        "synthetic_signal": safe_round(
            synthetic_signal
        ),
        "observations": observations,
    }