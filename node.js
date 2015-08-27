
// 
// Usage: node.exe node.js cr .' Hello World!!' cr bye
//

global.jeForth = require('./jeforth.js').jeForth;
global.vm = new jeForth();
global.vm.g = {};
var type = vm.type = function (s) { 
			try {
				var ss = s + ''; // Print-able test to avoid error 'JavaScript error on word "." : invalid data'
			} catch(err) {
				var ss = Object.prototype.toString.apply(s);
			}
			process.stdout.write(ss);
		}; 
vm.clearScreen = function(){console.log('\033c')} // '\033c' or '\033[2J' http://stackoverflow.com/questions/9006988/node-js-on-windows-how-to-clear-console
vm.fso = require('fs');
vm.readTextFile = function(pathname){return(vm.fso.readFileSync(pathname,'utf-8'))}
vm.writeTextFile = function(pathname,data){vm.fso.writeFileSync(pathname,data,'utf8')}
vm.bye = function(n){process.exit(n)}
vm.prompt = "OK";

// There's no main loop, event driven call back function is this.
vm.forthConsoleHandler = function(cmd) {
	var rlwas = vm.rstack().length; // r)stack l)ength was
	vm.dictate(cmd);
	(function retry(){
		// rstack 平衡表示這次 command line 都完成了，這才打 'OK'。
		// event handler 從 idle 上手，又回到 idle 不會讓別人看到它的 rstack。
		// 雖然未 OK, 仍然可以 key in 新的 command line 且立即執行。
		if(vm.rstack().length!=rlwas)
			setTimeout(retry,100); 
		else {
			type(" " + vm.prompt + " ");
		}
	})();
}
 
vm.stdio = require('readline').createInterface({input: process.stdin,output: process.stdout});
vm.stdio.on('line', vm.forthConsoleHandler);
vm.stdio.setPrompt(' '+vm.prompt+' ',4);
vm.init(type);
vm.dictate(vm.fso.readFileSync('jeforth.f','utf-8'));
// dictate() 之後不能再有任何東西，否則因為有 sleep/suspend/resume 之故，會被意外執行到。

