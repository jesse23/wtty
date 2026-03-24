import { Command } from 'commander';
import { registerCommands } from './commands';

const program = new Command();
program.name('webtty').description('Web TTY — run terminal sessions in a browser tab');

registerCommands(program);

program.action(async () => {
  await program.parseAsync(['run', 'main'], { from: 'user' });
});

program.parseAsync(process.argv);
