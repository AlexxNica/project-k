var fso = new ActiveXObject("Scripting.FileSystemObject"); // global file system object
var jeforth_kernel = fso.OpenTextFile(".\\jeforth.js",1/*forReading*/).readAll();
var stdin = WScript.StdIn;
var stdout = WScript.StdOut;
function type(t){stdout.Write(t+"")}
for(;;) {
	type("\n> ");
    var line = stdin.ReadLine()||"";
    var result = eval(line);
	type(result);
}