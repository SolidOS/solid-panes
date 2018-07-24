# Wrap TTL files into JS files for bundling with library

,all : wf.js

#individualForm.js : individualForm.ttl
#				(echo 'module.exports = `' ; cat individualForm.ttl; echo '`') >  individualForm.js

wf.ttl:
				curl  http://www.w3.org/2005/01/wf/flow.n3 > wf.ttl

wf.js : wf.ttl
				(echo 'module.exports = `' ; cat wf.ttl; echo '`') >  wf.js
