FROM golang:1.15.8
WORKDIR /app
COPY . /app
RUN go build
EXPOSE 9992
ENTRYPOINT ["./zhuhai"]
