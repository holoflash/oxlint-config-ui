#!/bin/bash

OXLINT_BIN="./node_modules/.bin/oxlint"

if [ ! -x "$OXLINT_BIN" ]; then
    echo "Oxlint not found. Please install project dependencies." >&2
    exit 1
fi

$($OXLINT_BIN --rules | awk '
BEGIN {
    print "["
    ORS = ",\n"
    first_record = 1
    category = ""
}

/^## / {
    category = $2
}

/^\| [a-z]/ {
    if (first_record == 1) {
        first_record = 0
    } else {
        printf ORS
    }

    printf "  {\n"
    printf "    \"name\": \"%s\",\n", $2
    printf "    \"source\": \"%s\",\n", $4
    printf "    \"category\": \"%s\"\n", category
    printf "  }"
}

END {
    printf "\n]\n"
}
' > oxlint_rules.json)
