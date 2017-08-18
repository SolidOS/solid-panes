
new.js : new.html
		(echo 'module.exports = `'; cat new.html; echo '`') > new.js

new.html :
	curl -HAccept:text/html https://dokie.li/new > new.html
