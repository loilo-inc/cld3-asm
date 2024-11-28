FROM emscripten/emsdk:3.1.72-arm64 AS protobuf
ARG PROTOBUF_VERSION="21.12"
ARG CPPSTD="14"
# Checkout protobuf and cld3
WORKDIR /src
RUN apt update && apt install build-essential -y
RUN git clone https://github.com/kwonoj/protobuf-wasm
RUN git clone https://github.com/protocolbuffers/protobuf\
  && cd protobuf \
  && git checkout v$PROTOBUF_VERSION \
  && git submodule update --init --recursive
RUN git clone https://github.com/google/cld3.git
# Install protoc (for aarch64)
WORKDIR /tmp
RUN curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v${PROTOBUF_VERSION}/protoc-${PROTOBUF_VERSION}-linux-aarch_64.zip\
  && mkdir -p protoc-${PROTOBUF_VERSION}-linux-aarch_64\
  && unzip protoc-${PROTOBUF_VERSION}-linux-aarch_64.zip -d protoc-${PROTOBUF_VERSION}-linux-aarch_64 \
  && cp protoc-${PROTOBUF_VERSION}-linux-aarch_64/bin/protoc /usr/local/bin/protoc
# Build protobuf (for wasm)
WORKDIR /src/protobuf
RUN emcmake cmake . -DCMAKE_CXX_STANDARD=${CPPSTD} -DCMAKE_BUILD_TYPE=Release
RUN emmake make libprotobuf-lite
# Build cld3 (for wasm)
ADD ./build/Makefile ./build/cwrap.patch /src/cld3/src/
ADD ./build/cwrap.patch /src/cld3/src/
WORKDIR /src/cld3/src
RUN git apply cwrap.patch
RUN emmake make \
  CXXFLAGS='-std=c++${CPPSTD} -pedantic -I/src/protobuf/src -I/src/protobuf/third_party/abseil-cpp'\
  PROTOBUF_LIBS='-L/src/protobuf -lprotobuf-lite' libcld3.a
RUN em++ libcld3.a
ADD ./build/build.sh /src/cld3/src/
ARG TSC_VERSION="5.7.2"
RUN npm install -g typescript@$TSC_VERSION
