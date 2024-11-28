IMAGE := docker-cld3-wasm

image:
	docker build -t $(IMAGE) ./docker-cld3-wasm

all: src/lib/web/cld3.js src/lib/node/cld3.js src/lib/worker/cld3.js

src/lib/web/cld3.js: image
	OUTDIR=./src/lib \
	IMAGE=$(IMAGE) \
	ENVIRONMENT=web \
	./build.sh
src/lib/node/cld3.js: image
	OUTDIR=./src/lib \
	IMAGE=$(IMAGE) \
	ENVIRONMENT=node \
	./build.sh
src/lib/worker/cld3.js: image
	OUTDIR=./src/lib \
	IMAGE=$(IMAGE) \
	ENVIRONMENT=worker \
	./build.sh

clean:
	rm -rf ./src/lib
