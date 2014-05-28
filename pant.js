{
	"document": "IPPOAD",
	"description": "pant",
	"version": "5.2",
	"segments": [
		"UNB": {
			"description": "Interchange Header",
			"required": true,
			"repeatable": false,
			"fields": [
				"syntax": {
					"description": "Identification of the agency controlling the syntax and indication of syntax level."
					"required": true,
					"components": [
						"id": {
							"description": "Coded identification of the agency controlling a syntax and syntax level used in an interchange.",
							"type": "string",
							"length": 4
						},
						"number": {
							"description": "Version number of the syntax identified in the syntax identifier",
							"type": "number",
							"value" : 3
						}
					]
				},

			]
		}

	],
}
