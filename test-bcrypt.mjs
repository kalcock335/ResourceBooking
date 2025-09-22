import bcrypt from 'bcryptjs';

const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);
console.log('Password:', password);
console.log('Hash:', hash);
console.log('Verify (admin123):', bcrypt.compareSync('admin123', hash));
console.log('Verify (wrong):', bcrypt.compareSync('wrong', hash)); 