mkdir -p ${OUTDIR}
docker run --name ${IMAGE}:${ENVIRONMENT} -t ${IMAGE} /bin/bash -l -c "./build.sh -o /out/cld3_$ENVIRONMENT.js -s ENVIRONMENT=$ENVIRONMENT"
docker cp ${IMAGE}:${ENVIRONMENT}:/out ${OUTDIR}
