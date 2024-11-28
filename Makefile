IMAGE := docker-cld3-wasm
OUTDIR := src/lib/web

image:
	docker build -t $(IMAGE) ./docker-cld3-wasm
src/lib/web/cld3.js: image
	OUTDIR=./src/lib \
	IMAGE=$(IMAGE) \
	ENVIRONMENT=web \
	./build.sh
