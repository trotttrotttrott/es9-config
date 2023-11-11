serve-1.2.0.beta.1:
	ruby -run -e httpd 1.2.0.beta.1/ -p 9090

serve-1.2.0.beta.2:
	ruby -run -e httpd 1.2.0.beta.2/ -p 9090

serve-1.2.1:
	python3 -m http.server --directory 1.2.1/ 9090

serve-1.2.2:
	python3 -m http.server --directory 1.2.2/ 9090

serve-1.3.1:
	python3 -m http.server --directory 1.3.1/ 9090

browser:
	open localhost:9090
