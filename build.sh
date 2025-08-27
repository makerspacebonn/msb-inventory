docker build . -t msb-inventory --platform="linux/amd64" &&
docker tag msb-inventory falkkuehnel/msb-inventory:latest &&
docker push falkkuehnel/msb-inventory:latest