project-k
========

��z FigTaiwan �� JavaScript �g���� Forth VM, �u�M�`�b kernel.js �ϥ���b�Ҧ��� application �]HTML, Node.js, Node-webkit, WSH, HTA, ���^�q�ΡC�o�|�ϱo kernel.js ���²�B�����C�Y�Ϧp���A�Ѫ��v����ܡB�쵲�c���]�p�B��C�@���R�W�A�һݼs�x�N���C

���Z������b GitHub > project-k > Wiki �ѰѻP�̽s��C�]�i�H�z�L GitHub > project-k > issues �l�ܰQ�׳涵���D�C

���ѷ�e���
=============

 - �ɮ�
 - �p�� include kernel.js
 - �H Node.js �Ť⪽���ϥ� kernel.js 
 - kernel.js �̪��զ�����

�ɮ�
------

 1. kernel.js �]�N�Ӱߤ@��s���ɮסA�L�H�W���A���� kernel�^
 2. kernel.f �]�ȨѰѦҡ^
 3. quit.f �]�L�ΡA�ζȨѫ�ĳ�^

�p�� include kernel.js [�]video�^](http://www.camdemy.com/media/19528)
-----------------------------

kernel.js ���Ѫ��O�@�� Forth VM �� constructor. �ȥB�u�� Yap ���ͭ�СA�W�� KsanaVM(). �H�U���|�ϥ� KsanaVM() �ͦ� kvm ���X�ؤ覡�C�䤤 kvm �Y�� Forth VM �� instance. �i���ݭn���N�R�W�A���`�N instance �����W��M�|�o�ʾ�M application. 

�Цh����B�Ы��I�O�_���O���覡�ݭn�Ҽ{�i�ӡC

**a.** For HTML, HTA, and Node-webkit:

    <script src="./kernel.js"></script>
    <script> window.kvm = new KsanaVM(); </script>

**b.** For Node.js and Node-webkit:

    global.KsanaVM = require("./kernel.js").KsanaVM;
    global.kvm = new KsanaVM();

**c.** For WSH:

    eval(readTextFile(".\\kernel.js"));
    kvm = new KsanaVM();

�H Node.js �Ť⪽���ϥ� kernel.js [�]video�^](http://www.camdemy.com/media/19529)
--------------------------------------------------

�o�ܦn���A�z�������x JavaScript�C�ǥѤ�ʾާ@�A���@�M�N���ӹ糧 project �|���ܲM�����{�ѡC

(1). �H Node.js ����, Just run it:

    node.exe
    
(2). Do the [above **b.**](http://www.camdemy.com/media/19528) to create **kvm** under the Node.js console.

(3). Define **type()** for the specific application. For Node.js text console in this example case:

    kvm.type = function (s) { 
	    try {
            var ss = s + '';
        } catch(err) {
            var ss = Object.prototype.toString.apply(s);
        }
        process.stdout.write(ss);
    }

(4). Test kvm.type('abc')

(5). Play around with kvm properties and methods

    kvm.init()
    kvm.dictate("123")
    kvm.stack()
    kvm.dictate("code hi type('Hello World!!') end-code")
    kvm.dictate("hi")
    kvm.words
    kvm.dictionary

kernel.js �̪��զ����� �]video�^
---------------------------------

 1. Exported properties and methods
 2. VM internal global variables
 3. VM internal global methods

###Exported properties and methods

vm.init() �걵�ߤ@�� I/O�C"vm" �O KsanaVM �����ѦҦۨ��� reference. �Y instance �O foo = new KsanaVM() �h foo �N�O vm�C 

	vm.init = function () { 
		type = vm.type;
	}

vm.dictate() �O�ߤ@��~���uť�O�̡v�A�]���� context save-restore �ҥH�uť�O�̡v���O�W�ߪ�����C�u�n�ҤU�R�O�d�� idle time �� JavaScript host �N�i�H�P�� dictate ���u�@�թR�O�� KsanaVM multi-tasking�C

	// Recursively evaluate the input. 
	// The input can be multiple lines or an entire ~.f file but
	// it usually is the TIB.
	function dictate(input) {
		var tibwas=tib, ntibwas=ntib, ipwas=ip;
		tib = input; 
		ntib = 0;
		stop = false; // stop �O�� outer loop �ݪ��A�o�̭n���M���C
		outer();
		tib = tibwas;
		ntib = ntibwas;
		ip = ipwas;
	}
	vm.dictate = dictate;

Data stack �`�Q�ާˡA�� reference �|���ҥH�n�� function �����Ǧ^�����CReturn stack �]��ۤ�ӿ�z:

	vm.stack = function(){return(stack)};
	vm.rstack = function(){return(rstack)};

words �����c�O words["vocabulary"]["word-name"] �Ҧ��� Forth word ���b words ���U�Fdictionary �O��ª� array�C�o��� vm property �����|�Q�ާˡA�����H��� export:

	vm.words = words;
	vm.dictionary = dictionary;

###VM internal global variables

�Ʊ�o�� variables ����]�p��O�H�@��Y���L�ݸ����C (video)

	var vm = this;
	var ip=0;
	var stack = [] ;
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
	var newhelp = ""; // new word's help
	var type = function(){}; // The only I/O, dummy at first.
	var g = {}; // global hash

###VM internal global functions

�o�O�̫�@�q�F�A�� project �u���S���h�֪F��C�Ʊ�o�� function ����O�H�@��Y�����ݭn�Ӧh�����C (video)

	type("s") 
	nextstring("delimitor") 
	nexttoken("delimitor")
	mytypeof(x)
	panic("msg", boolean:severe) and jsc
	isReDef("name")
	reset(void) 
	Word(a[])

�H�U���O�ǲ� Forth ������ function �ɶq���H Forth �ߨ��� word name �R�W�G (video)

	last(void)
	current_word_list(void)
	context_word_list(void)
	tick("name")
	comma(x)
	execute(x)
	inner (entry, boolean:resuming)
	outer(entry)
	dictate("input")
	tos(index,data)
	rtos(index,data)
	pop(index)
	push(data,index)


> Written with [StackEdit](https://stackedit.io/).

