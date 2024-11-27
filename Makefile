IMAGE := docker-cld3-wasm
OUTDIR := src/lib/web
image:
	docker build -t $(IMAGE) ./docker-cld3-wasm
src/lib/web/cld3.js: image
	mkdir -p ${OUTDIR}
	docker run --name $(IMAGE)-web -t ${IMAGE} /bin/bash -l -c "./build.sh -o /out/cld3_web.js -s ENVIRONMENT=web"
	docker cp $(IMAGE)-web:/out ${OUTDIR}

$(foreach env,node worker web,$(eval $(call build_target,$(env))))
