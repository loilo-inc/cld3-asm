FROM emscripten/emsdk:3.1.72-arm64 AS protobuf
ARG PROTOBUF_VERSION="28.3"
WORKDIR /workspace
RUN apt update && apt install build-essential -y
RUN git clone https://github.com/kwonoj/protobuf-wasm
RUN git clone https://github.com/protocolbuffers/protobuf
WORKDIR /workspace/protobuf
RUN git checkout v$PROTOBUF_VERSION
RUN apt install bazel-bootstrap -y
RUN cd /workspace/protobuf/third_party && \
    git clone https://github.com/abseil/abseil-cpp && \
    cd ./abseil-cpp && \
    git checkout 20240722.0

FROM emscripten/emsdk:3.1.72-arm64
ARG PROTOBUF_VERSION="28.3"
ARG TARGET="wasm"
WORKDIR /workspace
COPY --from=protobuf /workspace/protobuf /workspace/protobuf
WORKDIR /workspace/protobuf
ENV CC=clang
ENV CXX=clang++
RUN apt update && apt install -y clang
RUN cmake . -DCMAKE_CXX_STANDARD=14 -Dprotobuf_BUILD_TESTS=OFF
RUN make && make install
RUN emcmake cmake . -DCMAKE_CXX_STANDARD=14 -Dprotobuf_BUILD_TESTS=OFF
RUN emmake make libprotobuf-lite
RUN mkdir -p /out
RUN git clone https://github.com/google/cld3.git /cld-$TARGET/cld3
ADD ./build/build.sh ./build/cwrap.patch /cld-$TARGET/cld3/src/
ADD ./build/Makefile ./build/configure /cld-$TARGET/cld3/src/
WORKDIR /cld-$TARGET/cld3/src
RUN protoc --version
RUN git apply cwrap.patch
RUN emmake make \
  CXX=clang \
  CXXFLAGS='-std=c++14 -pedantic'\
  PROTOBUF_LIBS='-L/workspace/protobuf -lprotobuf-lite' libcld3.a
