import { join } from "path";

const csv = require('csvtojson/v2')

const main = async () => {
  const jsonArray = await csv().fromFile(join(__dirname, '/data.csv'));

  console.log(jsonArray)
}

main()
  .then(() => {
    console.log('done!')
  })
  .catch((err) => {
    console.error(err)
    process.exit()
  })