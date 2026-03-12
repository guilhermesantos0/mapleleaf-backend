import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/pt-br';

const Dayjs = (dayjs as any).default || dayjs;
const utcPlugin = (utc as any).default || utc;
const timezonePlugin = (timezone as any).default || timezone;

Dayjs.extend(utcPlugin);
Dayjs.extend(timezonePlugin);

Dayjs.locale('pt-br');
Dayjs.tz.setDefault('America/Sao_Paulo');

export default Dayjs;