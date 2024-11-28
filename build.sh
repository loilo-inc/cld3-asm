mkdir -p ${OUTDIR}
CONTAINER_ID=${IMAGE}-$(date +%s)
docker run --name ${CONTAINER_ID} -t ${IMAGE} /bin/bash -l -c \
  "SRCDIR=/src ./build.sh -o /src/cld3.js -s ENVIRONMENT=${ENVIRONMENT}"
docker cp ${CONTAINER_ID}:/src/cld3.js ${OUTDIR}/${ENVIRONMENT}
docker rm ${CONTAINER_ID}
