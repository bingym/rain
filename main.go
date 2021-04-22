package main

import (
	"html/template"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		tpl := template.Must(template.ParseFiles("./templates/index.html"))
		tpl.Execute(w, nil)
	})
	if err := http.ListenAndServe(":9992", nil); err != nil {
		panic(err)
	}
}
