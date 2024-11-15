const fs = require('fs-extra');
const xmlBuilder = require('xmlbuilder');

class CypressCustomReporter {
  constructor() {
    this.xml = xmlBuilder.create('test-cases');
    this.outputFiles = {
      business: './output_revised.txt',
      boundary: './output_boundary_revised.txt',
      exception: './output_exception_revised.txt',
      xml: './yaksha-test-cases.xml',
    };

    this.customData = '';

    // Load custom data if available
    try {
      const data = fs.readFileSync('../../custom.ih', 'utf8');
      this.customData = data;
    } catch (err) {
      console.error('Error reading custom data:', err.message);
    }

    // Clear old output files
    this.clearOutputFiles();
  }

  clearOutputFiles() {
    Object.values(this.outputFiles).forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Cleared existing file: ${filePath}`);
      }
    });

    // Ensure `test.txt` is cleared
    if (fs.existsSync('./test.txt')) {
      fs.unlinkSync('./test.txt');
      console.log('Cleared existing test.txt file.');
    }
  }

  logTestResult(test, status, error) {
    const testNameArray = test.title; // Get the test title array
    const testName = Array.isArray(testNameArray) ? testNameArray.join(' - ') : testNameArray;

    if (typeof testName !== 'string') {
      console.error('Test title is not a valid string:', testName);
      return;
    }

    const fileName = testName.split(' ')[1]?.toLowerCase() || 'boundary'; // Default to 'boundary'

    // Prepare result DTO
    const resultScore = status === 'passed' ? 1 : 0;
    const resultStatus = status === 'passed' ? 'Passed' : 'Failed';

    const testCaseResult = {
      methodName: this.camelCase(testName),
      methodType: 'boundary',
      actualScore: 1,
      earnedScore: resultScore,
      status: resultStatus,
      isMandatory: true,
      erroMessage: error || '',
    };

    const GUID = 'd907aa7b-3b6d-4940-8d09-28329ccbc070';
    const testResults = {
      testCaseResults: { [GUID]: testCaseResult },
      customData: this.customData,
    };

    // Write results to files
    const finalResult = JSON.stringify(testResults, null, 2);
    fs.appendFileSync('./test.txt', `${finalResult}\n`);

    const fileOutput = `${this.camelCase(testName)}=${status === 'passed'}`;
    const outputFile = this.outputFiles[fileName] || './output_boundary_revised.txt';
    fs.appendFileSync(outputFile, `${fileOutput}\n`);
    console.log(`Writing to file: ${outputFile} with content: ${fileOutput}`);

    // Add test details to XML
    this.prepareXmlFile(test, resultStatus);
  }

  sendDataToServer(testResults) {
    const XMLHttpRequest = require('xhr2');
    const xhr = new XMLHttpRequest();
    const url =
      'https://yaksha-prod-sbfn.azurewebsites.net/api/YakshaMFAEnqueue?code=jSTWTxtQ8kZgQ5FC0oLgoSgZG7UoU9Asnmxgp6hLLvYId/GW9ccoLw==';

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          console.log('Successfully sent data to the server:', xhr.responseText);
        } else {
          console.error('Failed to send data to the server:', xhr.status, xhr.statusText);
        }
      }
    };
    xhr.send(JSON.stringify(testResults));
  }

  prepareXmlFile(test, status) {
    const testNameArray = test.title;
    const testName = Array.isArray(testNameArray) ? testNameArray.join(' - ') : testNameArray;

    const testCaseType = testName.split(' ')[1]?.toLowerCase() || 'boundary';
    this.xml
      .ele('cases', {
        'xmlns:java': 'http://java.sun.com',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:type': 'java:com.assessment.data.TestCase',
      })
      .ele('test-case-type', this.capitalize(testCaseType))
      .up()
      .ele('expected-ouput', true)
      .up()
      .ele('name', this.camelCase(testName))
      .up()
      .ele('weight', 2)
      .up()
      .ele('mandatory', true)
      .up()
      .ele('desc', 'na')
      .end();
  }

  onEnd() {
    if (this.xml) {
      fs.writeFileSync(this.outputFiles.xml, this.xml.toString({ pretty: true }));
      console.log('XML file written:', this.outputFiles.xml);
    }
    console.log('Test suite completed.');
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  camelCase(str) {
    return str
      .split(' ')
      .map((word, index) => (index === 0 ? word.toLowerCase() : this.capitalize(word)))
      .join('');
  }
}

module.exports = CypressCustomReporter;



// const fs = require('fs');
// const xmlBuilder = require('xmlbuilder');
// const axios = require('axios'); // Import axios

// let createXMLFile = true;
// let customData = '';

// // Define TestCaseResultDto class
// class TestCaseResultDto {
//     constructor() {
//         this.methodName = '';
//         this.methodType = '';
//         this.actualScore = 0;
//         this.earnedScore = 0;
//         this.status = '';
//         this.isMandatory = true;
//         this.erroMessage = '';
//     }
// }

// // Define TestResults class
// class TestResults {
//     constructor() {
//         this.testCaseResults = '';
//         this.customData = '';
//     }
// }

// module.exports = (on) => {
//     const outputFiles = {
//         functional: './output_functional_revised.txt',
//         boundary: './output_boundary_revised.txt',
//         exception: './output_exception_revised.txt',
//         xml: './yaksha-test-cases.xml',
//     };

//     // Clear old files at the start of the test run
//     const clearOutputFiles = () => {
//         for (const key in outputFiles) {
//             if (fs.existsSync(outputFiles[key])) {
//                 fs.unlinkSync(outputFiles[key]);
//                 console.log(`Cleared existing file: ${outputFiles[key]}`);
//             }
//         }
//     };

//     // Write test results to files based on test case type
//     const writeTestResults = (results) => {
//         const test_Results = new TestResults();
//         const testCaseResults = {};

//         results.tests.forEach((test) => {
//             const testCaseType = determineTestCaseType(test.title.join(' '));
//             const outputFile = outputFiles[testCaseType] || outputFiles.boundary; // Default to boundary

//             // Extract the test ID (e.g., TS-1) and format the title
//             const match = test.title.join(' ').match(/(TS-\d+)\s(.+)/);
//             let formattedTitle = '';

//             if (match) {
//                 const [, testCaseId, testName] = match;
//                 formattedTitle = `${testCaseId}${camelCase(testName)}`;
//             } else {
//                 // Fallback if the format is unexpected
//                 formattedTitle = camelCase(test.title.join(' '));
//             }

//             // Determine the test result status
//             let resultStatus = 'Failed';
//             let resultScore = 0;
//             if (test.state === 'passed') {
//                 resultScore = 1;
//                 resultStatus = 'Passed';
//             }

//             // Create the TestCaseResultDto
//             const testCaseResult_Dto = new TestCaseResultDto();
//             testCaseResult_Dto.methodName = formattedTitle;
//             testCaseResult_Dto.methodType = testCaseType;
//             testCaseResult_Dto.actualScore = 1;
//             testCaseResult_Dto.earnedScore = resultScore;
//             testCaseResult_Dto.status = resultStatus;

//             // Generate a unique GUID for each test case
//             const GUID = 'd805050e-a0d8-49b0-afbd-46a486105170'; // You can use a library to generate GUIDs
//             testCaseResults[GUID] = testCaseResult_Dto;

//             // Append the result to the appropriate file
//             const fileOutput = `${formattedTitle}=${test.state === 'passed' ? 'Passed' : 'Failed'}\n`;
//             fs.appendFileSync(outputFile, fileOutput);
//             console.log(`Written to file: ${outputFile} with content: ${fileOutput}`);
//         });

//         // Add customData to the results
//         test_Results.testCaseResults = JSON.stringify(testCaseResults);
//         test_Results.customData = customData;

//         const finalResult = JSON.stringify(test_Results);
//         if (createXMLFile) {
//             const xml = xmlBuilder.create('test-cases');
//             results.tests.forEach((test) => prepareXmlFile(xml, test));
//             fs.writeFileSync(outputFiles.xml, xml.toString({ pretty: true }));
//             console.log('XML file created successfully.');
//         }

//         // Send HTTP request with results
//         sendTestResults(finalResult);
//     };

//     // Determine test case type based on title
//     const determineTestCaseType = (title) => {
//         if (title.toLowerCase().includes('functional')) return 'functional';
//         if (title.toLowerCase().includes('boundary')) return 'boundary';
//         if (title.toLowerCase().includes('exception')) return 'exception';
//         return 'boundary'; // Default case
//     };

//     // Prepare XML for a single test
//     const prepareXmlFile = (xml, test) => {
//         const testCaseType = determineTestCaseType(test.title.join(' '));
//         xml
//             .ele('cases', {
//                 'xmlns:java': 'http://java.sun.com',
//                 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
//                 'xsi:type': 'java:com.assessment.data.TestCase',
//             })
//             .ele('test-case-type', testCaseType)
//             .up()
//             .ele('expected-output', true)
//             .up()
//             .ele('name', camelCase(test.title.join(' ')))
//             .up()
//             .ele('weight', 2)
//             .up()
//             .ele('mandatory', true)
//             .up()
//             .ele('desc', 'na')
//             .end();
//     };

//     // Utility function to convert string to camelCase
//     const camelCase = (str) =>
//         str
//             .split(' ')
//             .map((word, index) => (index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1)))
//             .join('');

//     // Send the test results via HTTP request
//     const sendTestResults = (data) => {
//         const url = 'https://yaksha-prod-sbfn.azurewebsites.net/api/YakshaMFAEnqueue?code=jSTWTxtQ8kZgQ5FC0oLgoSgZG7UoU9Asnmxgp6hLLvYId/GW9ccoLw==';

//         axios.post(url, data, {
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//         })
//             .then((response) => {
//                 console.log('Test results sent successfully:', response.data);
//             })
//             .catch((error) => {
//                 console.error('Error sending test results:', error);
//             });
//     };

//     // Lifecycle hooks for Cypress
//     on('before:run', () => {
//         console.log('Starting Cypress tests...');
//         // Load custom data from a file (similar to the first reporter)
//         try {
//             customData = fs.readFileSync('../../custom.ih', 'utf8');
//             console.log('Custom data loaded successfully.');
//         } catch (err) {
//             console.error('Failed to load custom data:', err);
//         }

//         clearOutputFiles();
//     });

//     on('after:spec', (spec, results) => {
//         console.log(`Finished spec: ${spec.relative}`);
//         writeTestResults(results);
//     });

//     on('after:run', () => {
//         console.log('Cypress test run completed.');
//     });
// };


// const fs = require('fs');
// const xmlBuilder = require('xmlbuilder');

// let createXMLFile = true;
// let customData = '';

// // Define TestCaseResultDto class
// class TestCaseResultDto {
//     constructor() {
//         this.methodName = '';
//         this.methodType = '';
//         this.actualScore = 0;
//         this.earnedScore = 0;
//         this.status = '';
//         this.isMandatory = true;
//         this.erroMessage = '';
//     }
// }

// // Define TestResults class
// class TestResults {
//     constructor() {
//         this.testCaseResults = '';
//         this.customData = '';
//     }
// }

// module.exports = (on) => {
//     const outputFiles = {
//         functional: './output_functional_revised.txt',
//         boundary: './output_boundary_revised.txt',
//         exception: './output_exception_revised.txt',
//         xml: './yaksha-test-cases.xml',
//     };

//     // Clear old files at the start of the test run
//     const clearOutputFiles = () => {
//         for (const key in outputFiles) {
//             if (fs.existsSync(outputFiles[key])) {
//                 fs.unlinkSync(outputFiles[key]);
//                 console.log(`Cleared existing file: ${outputFiles[key]}`);
//             }
//         }
//     };

//     // Write test results to files based on test case type
//     const writeTestResults = (results) => {
//         const test_Results = new TestResults();
//         const testCaseResults = {};

//         results.tests.forEach((test) => {
//             const testCaseType = determineTestCaseType(test.title.join(' '));
//             const outputFile = outputFiles[testCaseType] || outputFiles.boundary; // Default to boundary

//             // Extract the test ID (e.g., TS-1) and format the title
//             const match = test.title.join(' ').match(/(TS-\d+)\s(.+)/);
//             let formattedTitle = '';

//             if (match) {
//                 const [, testCaseId, testName] = match;
//                 formattedTitle = `${testCaseId}${camelCase(testName)}`;
//             } else {
//                 // Fallback if the format is unexpected
//                 formattedTitle = camelCase(test.title.join(' '));
//             }

//             // Determine the test result status
//             let resultStatus = 'Failed';
//             let resultScore = 0;
//             if (test.state === 'passed') {
//                 resultScore = 1;
//                 resultStatus = 'Passed';
//             }

//             // Create the TestCaseResultDto
//             const testCaseResult_Dto = new TestCaseResultDto();
//             testCaseResult_Dto.methodName = formattedTitle;
//             testCaseResult_Dto.methodType = testCaseType;
//             testCaseResult_Dto.actualScore = 1;
//             testCaseResult_Dto.earnedScore = resultScore;
//             testCaseResult_Dto.status = resultStatus;

//             // Generate a unique GUID for each test case
//             const GUID = 'd805050e-a0d8-49b0-afbd-46a486105170'; // You can use a library to generate GUIDs
//             testCaseResults[GUID] = testCaseResult_Dto;

//             // Append the result to the appropriate file
//             const fileOutput = `${formattedTitle}=${test.state === 'passed' ? 'Passed' : 'Failed'}\n`;
//             fs.appendFileSync(outputFile, fileOutput);
//             console.log(`Written to file: ${outputFile} with content: ${fileOutput}`);
//         });

//         // Add customData to the results
//         test_Results.testCaseResults = JSON.stringify(testCaseResults);
//         test_Results.customData = customData;

//         const finalResult = JSON.stringify(test_Results);
//         if (createXMLFile) {
//             const xml = xmlBuilder.create('test-cases');
//             results.tests.forEach((test) => prepareXmlFile(xml, test));
//             fs.writeFileSync(outputFiles.xml, xml.toString({ pretty: true }));
//             console.log('XML file created successfully.');
//         }

//         // Send HTTP request with results
//         sendTestResults(finalResult);
//     };

//     // Determine test case type based on title
//     const determineTestCaseType = (title) => {
//         if (title.toLowerCase().includes('functional')) return 'functional';
//         if (title.toLowerCase().includes('boundary')) return 'boundary';
//         if (title.toLowerCase().includes('exception')) return 'exception';
//         return 'boundary'; // Default case
//     };

//     // Prepare XML for a single test
//     const prepareXmlFile = (xml, test) => {
//         const testCaseType = determineTestCaseType(test.title.join(' '));
//         xml
//             .ele('cases', {
//                 'xmlns:java': 'http://java.sun.com',
//                 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
//                 'xsi:type': 'java:com.assessment.data.TestCase',
//             })
//             .ele('test-case-type', testCaseType)
//             .up()
//             .ele('expected-output', true)
//             .up()
//             .ele('name', camelCase(test.title.join(' ')))
//             .up()
//             .ele('weight', 2)
//             .up()
//             .ele('mandatory', true)
//             .up()
//             .ele('desc', 'na')
//             .end();
//     };

//     // Utility function to convert string to camelCase
//     const camelCase = (str) =>
//         str
//             .split(' ')
//             .map((word, index) => (index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1)))
//             .join('');

//     // Send the test results via HTTP request
//     const sendTestResults = (data) => {
//         const xhr = new XMLHttpRequest();
//         const url = 'https://yaksha-prod-sbfn.azurewebsites.net/api/YakshaMFAEnqueue?code=jSTWTxtQ8kZgQ5FC0oLgoSgZG7UoU9Asnmxgp6hLLvYId/GW9ccoLw==';
//         xhr.open('POST', url, true);
//         xhr.setRequestHeader('Content-Type', 'application/json');
//         xhr.onreadystatechange = () => {
//             if (xhr.readyState === 4 && xhr.status === 200) {
//                 console.log('Test results sent successfully');
//             } else if (xhr.readyState === 4) {
//                 console.error('Failed to send test results');
//             }
//         };
//         xhr.send(data);
//     };

//     // Lifecycle hooks for Cypress
//     on('before:run', () => {
//         console.log('Starting Cypress tests...');
//         // Load custom data from a file (similar to the first reporter)
//         try {
//             customData = fs.readFileSync('../custom.ih', 'utf8');
//             console.log('Custom data loaded successfully.');
//         } catch (err) {
//             console.error('Failed to load custom data:', err);
//         }

//         clearOutputFiles();
//     });

//     on('after:spec', (spec, results) => {
//         console.log(`Finished spec: ${spec.relative}`);
//         writeTestResults(results);
//     });

//     on('after:run', () => {
//         console.log('Cypress test run completed.');
//     });
// };





// const fs = require('fs');
// const xmlBuilder = require('xmlbuilder');

// let createXMLFile = true;
// let customData = '';

// // Define TestCaseResultDto class
// class TestCaseResultDto {
//     constructor() {
//         this.methodName = '';
//         this.methodType = '';
//         this.actualScore = 0;
//         this.earnedScore = 0;
//         this.status = '';
//         this.isMandatory = true;
//         this.erroMessage = '';
//     }
// }

// // Define TestResults class
// class TestResults {
//     constructor() {
//         this.testCaseResults = '';
//         this.customData = '';
//     }
// }

// module.exports = (on) => {
//     const outputFiles = {
//         functional: './output_functional_revised.txt',
//         boundary: './output_boundary_revised.txt',
//         exception: './output_exception_revised.txt',
//         xml: './yaksha-test-cases.xml',
//     };

//     // Clear old files at the start of the test run
//     const clearOutputFiles = () => {
//         for (const key in outputFiles) {
//             if (fs.existsSync(outputFiles[key])) {
//                 fs.unlinkSync(outputFiles[key]);
//                 console.log(`Cleared existing file: ${outputFiles[key]}`);
//             }
//         }
//     };

//     // Write test results to files based on test case type
//     const writeTestResults = (results) => {
//         results.tests.forEach((test) => {
//             const testCaseType = determineTestCaseType(test.title.join(' '));
//             const outputFile = outputFiles[testCaseType] || outputFiles.boundary; // Default to boundary

//             // Extract the test ID (e.g., TS-1) and format the title
//             const match = test.title.join(' ').match(/(TS-\d+)\s(.+)/);
//             let formattedTitle = '';

//             if (match) {
//                 const [, testCaseId, testName] = match;
//                 formattedTitle = `${testCaseId}${camelCase(testName)}`;
//             } else {
//                 // Fallback if the format is unexpected
//                 formattedTitle = camelCase(test.title.join(' '));
//             }

//             const fileOutput = `${formattedTitle}=${test.state === 'passed' ? 'Passed' : 'Failed'}\n`;

//             // Append the formatted output to the appropriate file
//             fs.appendFileSync(outputFile, fileOutput);
//             console.log(`Written to file: ${outputFile} with content: ${fileOutput}`);
//         });

//         if (createXMLFile) {
//             const xml = xmlBuilder.create('test-cases');
//             results.tests.forEach((test) => prepareXmlFile(xml, test));
//             fs.writeFileSync(outputFiles.xml, xml.toString({ pretty: true }));
//             console.log('XML file created successfully.');
//         }
//     };

//     // Determine test case type based on title
//     const determineTestCaseType = (title) => {
//         if (title.toLowerCase().includes('functional')) return 'functional';
//         if (title.toLowerCase().includes('boundary')) return 'boundary';
//         if (title.toLowerCase().includes('exception')) return 'exception';
//         return 'boundary'; // Default case
//     };

//     // Prepare XML for a single test
//     const prepareXmlFile = (xml, test) => {
//         xml
//             .ele('cases', {
//                 'xmlns:java': 'http://java.sun.com',
//                 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
//                 'xsi:type': 'java:com.assessment.data.TestCase',
//             })
//             .ele('test-case-type', determineTestCaseType(test.title.join(' ')))
//             .up()
//             .ele('expected-output', true)
//             .up()
//             .ele('name', camelCase(test.title.join(' ')))
//             .up()
//             .ele('weight', 2)
//             .up()
//             .ele('mandatory', true)
//             .up()
//             .ele('desc', 'na')
//             .end();
//     };

//     // Utility function to convert string to camelCase
//     const camelCase = (str) =>
//         str
//             .split(' ')
//             .map((word, index) => (index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1)))
//             .join('');

//     // Cypress lifecycle events
//     on('before:run', () => {
//         console.log('Starting Cypress tests...');
//         clearOutputFiles();
//     });

//     on('after:spec', (spec, results) => {
//         console.log(`Finished spec: ${spec.relative}`);
//         writeTestResults(results);
//     });

//     on('after:run', () => {
//         console.log('Cypress test run completed.');
//     });
// };