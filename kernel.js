"uses strict";
function Kvm() {     
	var kvm = this;
	var ip=0;
	var stack = [] ;
	var stackwas = []; // Definition of : ... ; needs a temp storage.
	var rstack = [];
	var vocs = [];
	var words = [];
	var current = "forth";
	var context = "forth";
	var order = [context];
	var wordhash = {};
	var dictionary=[]; dictionary[0]=0;
	var here=1;
	var tib="";
	var ntib=0;
	var RET=null; // The 'ret' instruction code. It marks the end of a colon word.
	var EXIT=""; // The 'exit' instruction code.
	var compiling=false;
	var stop = false; // Stop the outer loop
	var newname = ""; // new word's name
	var newxt = function(){}; // new word's function()
	var newhelp = "";
	var colonxt = function(){}; // colon word's xt function is a constant
	var printStr = function(){}; // dummy 
	var g = {}; // global hash

	kvm.init = function () { 
		printStr = kvm.printStr;
	}
	
	function Word(a) {
		this.name = a.shift();  // name and xt are mandatory
		this.xt = a.shift();
		var statement;
		while(statement=a.shift()) {  // extra arguments are statement strings
			eval(statement);
		}
	}
	Word.prototype.toString = function(){return this.help}; // every word introduces itself
	
	// Support Vocabulary
	function last(){  // returns the last defined word.
		return words[current][words[current].length-1];
	}
	function current_word_list(){  // returns the word-list where new defined words are going to
		return words[current];
	}
	function context_word_list(){  // returns the word-list that is searched first.
		return words[context];
	}
	
	// Reset the forth VM
	function reset(){
		// stack = []; don't clear it's a clue for debug
		rstack = [];
		dictionary[0]=0; // dictionary[0]=0 reserved for inner() as its terminator
		compiling=false;
		ip=0; // forth VM instruction pointer
		stop = true; // ntib = tib.length; // reserve tib and ntib for debug
		printStr('-------------- Reset forth VM --------------\n');
	}
	
	function panic(msg,severe) {
		var t='';
		if(compiling) t += '\n------------- Panic! while compiling '+newname+' -------------\n';
		else t +=          '\n------------------- P A N I C ! -------------------------\n';
		t += msg;
		t += "stop: " + stop +'\n';
		t += "compiling: " + compiling +'\n';
		t += "stack.length: " + stack.length +'\n';
		t += "rstack.length: " + rstack.length +'\n';
		t += "ip: " + ip +'\n';
		t += "ntib: " + ntib + '\n';
		t += "tib.length: " + tib.length + '\n';
		var beforetib = tib.substr(Math.max(ntib-40,0),40);
		var aftertib  = tib.substr(ntib,80);
		t += "tib: " + beforetib + "<ntib>" + aftertib + "...\n";
		printStr(t);
		if(compiling) {
			compiling = false;
			stop = true; // ntib = tib.length;
		}
		if(severe) // switch to JavaScript console, if available, for severe issues.
			if(tick("jsc")) {
				fortheval("jsc");
			}
	}

	// Get string from recent ntib down to, but not including, the next delimiter.
	// Return {str:"string", flag:boolean}
	// If delimiter is not found then return the entire remaining TIB, multi-lines, through result.str�C
	// result.flag indicates delimiter found or not found.
	// o  If you want to read the entire TIB string, use nexttoken('\n|\r'). It eats the next 
	//    white space after ntib. If use nextstring('\n|\r') then the leading white space(s) is included.
	// o  If you need to know whether the delimiter is found, use nextstring()�C
	// o  result.str is "" if TIB has nothing left.
	// o  The ending delimiter is remained. 
	// o  The delimiter is a regular expression.
	function nextstring(deli){
		var result={}, index;
		index = (tib.substr(ntib)).search(deli);  // search for delimiter in tib from ntib
		if (index!=-1) {   // delimiter found
			result.str = tib.substr(ntib,index);  // found, index is the length
			result.flag = true;
			ntib += index;  // Now ntib points at the delimiter.
		} else { // delimiter not found.
			result.str = tib.substr(ntib);  // get the tib from ntib to EOL
			result.flag = false;
			ntib = tib.length; // skip to EOL
		}
		return result;
	}
	
	// Get next token which is found after the recent ntib of TIB.
	// If delimiter is RegEx white-space ('\\s') or absent then skip all leading white spaces first, 
	// otherwise, only skip the first character which should be a white space.
	// o  Return "" if TIB has nothing left. 
	// o  Return the remaining TIB if delimiter is not found.
	// o  The ending delimiter is remained. 
	// o  The delimiter is a regular expression.
	function nexttoken(deli){
		if (arguments.length==0) deli='\\s';   // whitespace
		if (deli=='\\s') skipWhiteSpaces(); else ntib += 1; // Doesn't matter if already at end of TIB. 
		var token = nextstring(deli).str;
		return token; 
		function skipWhiteSpaces(){  // skip all white spaces at tib[ntib]
			var index = (tib.substr(ntib)).search('\\S'); // Skip leading whitespaces. index points to next none-whitespace.
			if (index == -1) {  // \S not found, entire line are all white spaces or totally empty
				ntib = tib.length;
			}else{
				ntib += index ; // skip leading whitespaces
			}
		}
	}
	
	// tick() is same thing as forth word '�C 
	// Let words[voc][0]=0 also means tick() return 0 indicates "not found".
	// Return the word obj of the given name or 0 if the word is not found.
	function tick(name) {
		return wordhash[name] || 0;  // 0 means 'not found'
	}
	
	// Return a boolean.
	// Is the new word reDef depends on only the words[current] word-list, not all 
	// word-lists, nor the word-hash table. Can't use tick() because tick() searches 
	// the word-hash that includes not only the words[current] word-list.
	function isReDef(name){
		var result = false;
		var wordlist = current_word_list();
		for (var i in wordlist)
			if (wordlist[i].name == name) {
				result = true;
				break;
			}
		return result;
	}
	
	// comma(x) compiles anything into dictionary[here]. x can be number, string, 
	// function, object, array .. etc�C
	// To compile a word, comma(tick('word-name'))
	function comma(x) {
		dictionary[here++] = x;
		dictionary[here] = RET;  // dummy
		// [here] will be overwritten, we do this dummy because 
		// RET is the ending mark for 'see' to know where to stop. 
	}
	
	// �Q�פ@�U�G
	// jeforth �� address �P ip �᳣̫���ӷ� dictionary[] �� index �ΡC address �� ip ���
	// �O dictionary[] �� index�C
	
	// ��Ҧ����P������ call() dolist() execute() runcolon() runFunc() ��������X�� execute(w)
	// �� inner(entry), �e�̥u����@�� word, ��̪u�� ip �~��]. The w can be word
	// object, word name, a function; while entry is an address�C
	
	// execute() ���� CPU instruction �� single step, �� inner() ���� CPU �� call ���O�C
	// �|�� �� inner() ���� outer() �H�� colon word �� xt(), �� execute() �h��B���ΡC 
	
	// �q code word �� call forth word ����k�� execute('word') �P fortheval('word word word')
	// �[�W inner(cfa) �T�ؤ�k�i�ѿ�ܡCfortheval() �Ȯɧö}�@�h outer loop, ��䤤
	// �u�ݨ��{�ɪ� TIB �]�N�O fortheval() �� input string�C

	// �̲׷��� inner loop �O�� while(w){ip++; w.xt(); w=dictionary[ip]}; �H�� return �ɪ�
	// ip=rstack.pop(); �զ��C�u�n�Ψ㦳 false �޿��ݩʪ��F��ӷ� ret �H�� exit �N�i�H�����C
	// �@�� null, "", false, NaN, undefined, and 0 ���إi�ѿ�ܡC���� RET=null, EXIT=""�C

	// Suspend VM �ɡA�n����Ҧ��� inner loop ���� pop return stack �H�� resume �ɫ�_����C
	// dictionary[0] �H�� words[<vid>][0] ���T�w�� 0, �N�O�n�y�� ip=w=0 �N��o���ΡC�q outer 
	// loop ��i�J inner loop ���ɭn�� push(0) �i return stack �p���J balance return stack �S
	// �� 0 �ӧ�t�o�ӯS��ت��C�� inner loop �b unbalanced �����p�U���� ip=rstack.pop(); where
	// ip is 0 �Y�i�J suspend �{�ǡA�O�d�ѤU�� unbalanced rstack �� debug �ѦҡC
	
	// -------------------- ###### The inner loop ###### -------------------------------------

	// ��z�U�ؤ��P������ entry ½Ķ����� w. 
	// phaseA() ���b major inner() loop ��, ���Ȫ�ɶ��C
	function phaseA (entry) { 
		var w = 0; 
		switch(typeof(entry)){
			case "string": // "string" is word name
				w = tick(entry.replace(/(^( |\t)*)|(( |\t)*$)/g,'')); // remove �Y�� whitespaces
				break;
			case "function": case "object": // object is a word
				w = entry; 
				break;
			case "number": 
				// number could be dictionary entry or 0. 
				// �i��O does> branch �� entry �� ret exit rstack pop �X�Ӫ��C
				ip = entry;
				w = dictionary[ip]; 
				break;
			default :
				panic("Error! execute() doesn't know how to handle this thing : "+entry+" ("+mytypeof(entry)+")\n","severe");
		}
		return w;
	}

	// �w�藍�P������ w �Ĩ����T�覡���楦�C
	function phaseB (w) { 
		switch(typeof(w)){
			case "number":  
				// �ݨ� number �q�`�O does> �� entry, 
				// ����� inner() �h call�A �_�h�|�O�Ӥ����o�{�� bug!!
				// �H�U�� push-jump ���� call instruction.
				rstack.push(ip); // Forth �� ip �O�u�U�@�ӡv�n���檺���O�A��Y return address.
				ip = w; // jump
				break;
			case "function": 
				w();
				break;
			case "object": // Word object
				try { // �ۤv�B�z JavaScript errors �H�K�ʤ��ʴN�Q�ϥX�h.
					w.xt();
				} catch(err) {
					panic('JavaScript error on word "'+w.name+'" : '+err.message+'\n',"error");
				}
				break;
			default :
				panic("Error! don't know how to execute : "+w+" ("+mytypeof(w)+")\n","error");
		}
	}

	function execute(entry) { 
		var w; 
		if (w = phaseA(entry)){
			if(typeof(w)=="number") panic("Error! please use inner("+w+") instead of execute("+w+").\n","severe");
			else phaseB(w); 
		}
	}

	function inner (entry, resuming) {
		var w = phaseA(entry); // ½Ķ����� w.
		do{
			while(w) {
				ip++; // Forth ���q�ҡAinner loop �ǳ� execute �o�� word ���e�AIP ������U�@�� word.
				phaseB(w); // �w�藍�P������ w �Ĩ����T�覡���楦�C
				w = dictionary[ip];
			}
			if(w===0) break; // w==0 is suspend, break inner loop but reserve rstack. Inner loop �����b�~���}�C
			else ip = rstack.pop(); // w is either ret(NULL) or exit(""). �ǳ� return �F�C
			if(resuming) w = dictionary[ip]; // ���`���W�h inner() ���w�g�Q suspend �������F�Aresume �n�ۤv�ɦ�C
		} while(ip && resuming); // Resuming inner loop. ip==0 means resuming has done�C
	}
	// ### End of the inner loop ###

	// -------------------------- the outer loop ----------------------------------------------------
	// forth outer loop, 
	// If entry is given then resume from the entry point by executing the remaining colon thread 
	// from entry and then the tib/ntib string.
	// 
	function outer(entry) {
		if (entry) inner(entry, true); // resume from the breakpoint 
		while(!stop) {
			var token=nexttoken();
			if (token==="") break;    // TIB �����F�A loop �X�f�b�o�̡C
			outerExecute(token);
		}
	}
	
	// ��B�z�@�� token. 
	function outerExecute(token){
		var w = tick(token);   // not found is 0. w is an Word object.
		if (w) {
			if(!compiling){ // interpret state or immediate words
				if (w.compileonly) {
					panic("Error! "+token+" is compile-only.\n", tib.length-ntib>100);
					return;
				}
				execute(w);
			} else { // compile state
				if (w.immediate) {
					execute(w); // inner(w);
				} else {
					if (w.interpretonly) {
						panic("Error! "+token+" is interpret-only.\n", tib.length-ntib>100);
						return;
					}
					comma(w); // �N w �s�J dictionary. w is a Word() object
				}
			}
		} else if (isNaN(token)) {
			// parseInt('123abc') �����G�O 123 �ܦM�I! �ҥH�e���n�� isNaN() ������C		
			panic("Error! "+token+" unknown.\n", tib.length-ntib>100);
			return;
		} else {
			if(token.substr(0,2).toLowerCase()=="0x") var n = parseInt(token);
			else  var n = parseFloat(token);
			push(n);
			if (compiling) execute("literal");
		}
	}
	// ### End of the outer loop ###
	
	// code ( -- ) Start to compose a code word. docode() is its run-time.
	// "( ... )" and " \ ..." on first line will be brought into this.help.
	// jeforth.js kernel has only two words, 'code' and 'end-code', jeforth.f
	// will be read from a file that will be a big TIB actually. So we don't 
	// need to consider about how to get user input from keyboard! Getting
	// keyboard input is difficult to me on an event-driven or a non-blocking 
	// environment like Node-webkit.
	function docode() {
	    // �N�өҦ��� code words ���|�{�o�o�̪� local variables �ҥH�o�̭��n�קK�Ψ���� local variable�C 
		compiling = "code"; // it's true and a clue of compiling a code word.
		newname = nexttoken();
		if(isReDef(newname)) printStr("reDef "+newname+"\n"); 	// �Y�� tick(newname) �N���F
		push(nextstring("end-code")); 
		if(tos().flag){
			eval(
				'newxt=function(){ /* ' + newname + ' */\n' + 
				pop().str + '\n}' // the ending "\n}" allows // comment at the end
			);
		} else {
			panic("Error! expecting 'end-code'.\n");
			reset();
		}
	}
	
	words[current] = [
		0,  // �O current_word_list()[0] == 0 ���ܦh�n�B�A�� tick() 
			// �Ǧ^ 0 �� current_word_list()[0] ���n�O 0, �����N�ץ��ѡCtick ' ���w�q�]²��C
		new Word([
			"code",
			docode,
			"this.vid='forth'",
			"this.wid=1",
			"this.type='code'",
			"this.help=this.name+' ( <name> -- ) Start composing a code word.'",
			"this.selftest='pass'"
		]),
		new Word([
			"end-code",
			function(){
				if(compiling!="code"){ panic("Error! 'end-code' to a none code word.\n"); return};
				current_word_list().push(new Word([newname,newxt]));
				last().vid = current;
				last().wid = current_word_list().length-1;
				last().type = 'code';
				last().help = newhelp;
				wordhash[last().name]=last();
				compiling  = false;
			},
			"this.vid='forth'",
			"this.wid=2",
			"this.type='code'",
			"this.immediate=true",
			"this.compileonly=true",
			"this.help=this.name+' ( -- ) Wrap up the new code word.'"
		])
	];
	
	// �� JavaScript ���Q���\�O�ӧ� word�C
	wordhash = {"code":current_word_list()[1], "end-code":current_word_list()[2]};
	
	// -------------------- main() ----------------------------------------

	// Recursively evaluate the input. 
	// The input can be multiple lines or an entire ~.f file but
	// it usually is the TIB.
	function fortheval(input) {
		var tibwas=tib, ntibwas=ntib, ipwas=ip;
		tib = input; 
		ntib = 0;
		stop = false; // stop �O�� outer loop �ݪ��A�o�̭n���M���C
		outer();
		tib = tibwas;
		ntib = ntibwas;
		ip = ipwas;
	}
	kvm.fortheval = fortheval;

	// -------------------- end of main() -----------------------------------------

	// Top of Stack access easier. ( tos(2) tos(1) tos(void|0) -- ditto )
	// tos(i,new) returns tos(i) and by the way change tos(i) to new value this is good
	// for counting up or down in a loop.
	function tos(index,value) {	
		switch (arguments.length) {
			case 0 : return stack[stack.length-1];
			case 1 : return stack[stack.length-1-index];
			default : 
				var data = stack[stack.length-1-index]
				stack[stack.length-1-index] = value; 
				return(data); 
		}
	}

	// Top of return Stack access easier. ( rtos(2) rtos(1) rtos(void|0) -- ditto )
	// rtos(i,new) returns rtos(i) and by the way change rtos(i) to new value this is good
	// for counting up or down in a loop.
	function rtos(index,value) {	
		switch (arguments.length) {
			case 0 : return rstack[rstack.length-1];
			case 1 : return rstack[rstack.length-1-index];
			default : 
				var data = rstack[rstack.length-1-index]
				rstack[rstack.length-1-index] = value; 
				return(data); 
		}
	}

	// Stack access easier. e.g. pop(1) gets tos(1) and leaves ( tos(2) tos(1) tos(void|0) -- tos(2) tos(void|0) )
	function pop(index) {	
		switch (arguments.length) {
			case 0  : return stack.pop();
			default : return stack.splice(stack.length-1-index, 1)[0];
		}
	}

	// Stack access easier. e.g. push(data,1) inserts data to tos(1), ( tos2 tos1 tos -- tos2 tos1 data tos )
	function push(data, index) { 
		switch (arguments.length) {
			case 0  : 	panic(" push() what?\n");
			case 1  : 	stack.push(data); 
						break;
			default : 	if (index >= stack.length) {
							stack.unshift(data);
						} else {
							stack.splice(stack.length-1-index,0,data);
						}
		}
	}

	// typeof(array) and typeof(null) are "object"! So a tweak is needed.
	function mytypeof(x){
		var type = typeof x;
		switch (type) {
		case 'object':
			if (!x) type = 'null';
			if (Object.prototype.toString.apply(x) === '[object Array]') type = "array";
		}
		return type;
	}
	// js> mytypeof([])           \ ==> array (string)
	// js> mytypeof(1)            \ ==> number (string)
	// js> mytypeof('a')          \ ==> string (string)
	// js> mytypeof(function(){}) \ ==> function (string)
	// js> mytypeof({})           \ ==> object (string)
	// js> mytypeof(null)         \ ==> null (string)  

	kvm.stack = function(){return(stack)}; // debug easier. stack �`�Q��A�d�b kvm �̥i��O�ª��A�ҥH�n�H�ɱq�{�l�̧�C
	kvm.rstack = function(){return(rstack)}; // debug easier especially debugging TSR
	kvm.words = words; // debug easier
	kvm.dictionary = dictionary; // debug easier
}
var kvm = new Kvm();
if (typeof exports!='undefined') exports.kvm = kvm;	// export for node.js APP

