import appFunc from './src';

const app = appFunc();
app.listen(parseInt(process.env.PORT) || 3000, '0.0.0.0').catch((err) => {
  console.error(err);
  process.exit(1);
});
