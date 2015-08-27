
if a%COMPUTERNAME%==aWKS-38EN3476     set NODEJSHOME=c:\Users\8304018\Dropbox\learnings\JavaScript\node.js
if a%COMPUTERNAME%==aDP-20121028UGNO  set NODEJSHOME=d:\hcchen\Dropbox\learnings\JavaScript\node.js
if a%COMPUTERNAME%==aWKS-38EN3477     set NODEJSHOME=c:\Users\8304018.WKSCN\Dropbox\learnings\JavaScript\node.js
path=%path%;%NODEJSHOME%
set NODE_PATH=%NODEJSHOME%\node_modules

subst /d x:
subst x: .
x:
chcp 950

if a%COMPUTERNAME%==aWKS-38EN3476     node64
if a%COMPUTERNAME%==aDP-20121028UGNO  node32
if a%COMPUTERNAME%==aWKS-38EN3477     node64


