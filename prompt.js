import inquirer from 'inquirer';
import fs from 'fs';

inquirer.prompt([
    {
      name: 'apiKey',
      message: 'Enter API key:',
      type: 'password' 
    }
  ])
  .then(answers => {
    fs.writeFileSync('.env', `API_KEY=${answers.apiKey}`);
  });