__all__ = ["DrowsinessSystem", "main"]


def __getattr__(name):
	if name in __all__:
		from .main import DrowsinessSystem, main

		return {"DrowsinessSystem": DrowsinessSystem, "main": main}[name]
	raise AttributeError(f"module 'src' has no attribute {name!r}")