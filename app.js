var tesseract = require('tesseract.js');

const scheduler = 'https://scheduler.distributed.computer';

var fs = require('fs')

 
async function main() {
  const compute = require('dcp/compute');

  // Tesseractjs does not work directly on pdf documents, therefor we will convert each pdf file to an array of PNG files
  // After alot of trouble, we found pdf-poopler

  var pdfConverter = require('pdf-poppler');
  var path = require('path');

  function convertImage(pdfPath) {
      let option = {
          format : 'jpeg',
          out_dir : './',
          out_prefix : path.basename(pdfPath, path.extname(pdfPath)),
          page : 1
      }
  // option.out_dir value is the path where the image will be saved

      pdfConverter.convert(pdfPath, option)
      .then(() => {
          console.log('file converted')
      })
      .catch(err => {
          console.log('an error has occurred in the pdf converter ' + err)
      })
  }
  
  convertImage('./sample.pdf');



  // We then read these files and feed them into tesseract.js using the DCP protocol.
  // Here everything works perfectly without DCP (text is extracted correctly) but when trying to use tesseract.js within the DCP I get a wierd "document not defined" error
  // I've tried debugging this for a long time but haven't found a fix yet


  var jpgData = fs.readFileSync('./sample-1.jpg');

  const job = compute.for(
    [jpgData, jpgData],
    async (data) => {
        try{
            const createWorker = tesseract.createWorker;
            const worker = createWorker();
            
            await worker.load();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            const { data: { text } } = await worker.recognize(data);
            return text;
        }
        catch(error){
            return error
        }
    }, 
  );

  job.requires('tesseract.js');


  job.on('accepted', (event) => {
    console.log(' - Job accepted by scheduler, waiting for results');
    console.log(` - Job has id ${job.id}`);
    startTime = Date.now();
  });
  job.on('complete', (event) => {
    console.log(
      `Job Finished, total runtime = ${
        Math.round((Date.now() - startTime) / 100) / 10
      }s`,
    );
  });
  job.on('readystatechange', (event) => {
    console.log(`New ready state: ${event}`);
  });
  job.on('status', (event) => {
    console.log('Received status update:', event);
  });
  job.on('console', ({ message }) => {
    console.log('Received console message:', message);
  });
  job.on('result', ({ result, sliceNumber }) => {
    console.log(
      ` - Received result for slice ${sliceNumber} at ${
        Math.round((Date.now() - startTime) / 100) / 10
      }s`,
    );
    console.log(` * Wow! ${result} is such a pretty colour!`);
  });
  job.on('error', (event) => {
    console.error('Received Error:', event);
  });

  job.public.name = 'Abhishek\s TOHacks Proj';
  job.public.description = 'Distributed PDF-TO-Text Converter';

//   const results = await job.exec(compute.marketValue);
  // OR
  const results = await job.localExec();

  console.log('Results are: ', results.values());
}

require('dcp-client')
    .init('https://scheduler-v3.distributed.computer')
    .then(main)
    .finally(() => setImmediate(process.exit));

