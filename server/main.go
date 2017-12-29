package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"
)

type RecaptchaResponse struct {
	Success     bool      `json:"success"`
	ChallengeTS time.Time `json:"challenge_ts"`
	Hostname    string    `json:"hostname"`
}

func main() {
	secretKey := os.Getenv("IRF__RECAPTCHA_SECRET_KEY")

	http.HandleFunc("/api/recaptcha", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "POST":
			w.Header().Set("Content-Type", "application/json")

			err := r.ParseForm()
			if err != nil {
				w.WriteHeader(500)
				return
			}

			token := r.Form.Get("g-recaptcha-response")
			if token == "" {
				w.WriteHeader(400)
				b, _ := json.Marshal(map[string]string{"message": "g-recaptcha-response is missing."})
				w.Write(b)
				return
			}

			v := url.Values{"secret": {secretKey}, "response": {token}}
			resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify", v)
			if err != nil {
				w.WriteHeader(400)
				return
			}
			defer resp.Body.Close()

			var rr RecaptchaResponse
			err = json.NewDecoder(resp.Body).Decode(&rr)
			if err != nil {
				w.WriteHeader(500)
				return
			}

			b, err := json.Marshal(rr)
			if err != nil {
				w.WriteHeader(500)
				return
			}

			w.Write(b)
		default:
			w.WriteHeader(404)
		}
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
