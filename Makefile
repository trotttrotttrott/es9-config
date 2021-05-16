serve-1.2.0.beta.1:
	ruby -run -e httpd 1.2.0.beta.1/ -p 9090

serve-1.2.0.beta.2:
	ruby -run -e httpd 1.2.0.beta.2/ -p 9090

browser:
	open localhost:9090
