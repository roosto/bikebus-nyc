#!/usr/bin/env bash

set -e -o pipefail

if [[ "$*" =~ \b(-h|--help)\b ]]
then
    echo "Usage: $0 <input_file> <output_file>"
    exit 0
fi

if [[ $# -ne 2 ]]
then
    echo "Usage: $0 <input_file> <output_file>"
    exit 1
fi

filename="$1"
output_file="$2"
if [[ ! -r "$filename" ]]
then
    echo "$0: Error: Input file '$filename' is not readable."
    exit 1
fi

if ! touch "$output_file"
then
    echo "$0: Error: Output file '$output_file' is not writable."
    exit 1
fi
function to_element {
    local coords="$1"
    local desc="$2"
    local waypoint_only="$3"

    cat <<JSON
  {
    "coordinates": [${coords}],
    "name": "$desc",
    "waypointOnly": $waypoint_only
  },
JSON

}

# read coordinates from file
coords_list=()
while read -r coords
do
    coords_list+=("$coords")
done < "$filename"

i=1
for coords in "${coords_list[@]}"
do
    read -p "desc for $i: " -r desc
    read -r -p "'$desc': \`wayPointOnly\`? [y/N]: " waypoint_only

    if [[ -n $waypoint_only && $waypoint_only =~ ^[yY] ]]
    then
        waypoint_only=true
    else
        waypoint_only=false
    fi

    to_element "$coords" "$desc" "$waypoint_only"
    i=$(( i + 1 ))
done
