# Autify-backend

### Without docker 
`run below command to fetch and get the metadata`

`node fetch https://www.google.com`

 `node --metadata https://www.google.com`
 

### With docker
`docker build -t autify-backend-image:1.0 .`

` docker run -p 3000:3000 autify-backend-image:1.0 fetch https://www.google.com`

` docker run -p 3000:3000 autify-backend-image:1.0 fetch --metadata https://www.google.com`
