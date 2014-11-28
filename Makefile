%.css: %.scss
	sass $< $@

all: paper.css
