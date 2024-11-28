mkdir -p ${OUTDIR}/${ENVIRONMENT}
CONTAINER_ID=${IMAGE}-$(date +%s)
docker run --name ${CONTAINER_ID} -t ${IMAGE} /bin/bash -l -c \
  "SRCDIR=/src ./build.sh -o /src/cld3.js -s ENVIRONMENT=${ENVIRONMENT} --emit-tsd /src/cld3.d.ts"
docker cp ${CONTAINER_ID}:/src/cld3.js ${OUTDIR}/${ENVIRONMENT}
docker cp ${CONTAINER_ID}:/src/cld3.d.ts ${OUTDIR}/${ENVIRONMENT}
docker rm ${CONTAINER_ID}
