import express from 'express';
import identifyHandler from './identify';

const app = express();
app.use(express.json());

app.post('/identify', identifyHandler);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
