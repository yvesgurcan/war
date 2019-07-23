a=1
for f in *; do 
    new=$(printf "%03d" "$a") # 0Xd pads length of number to X (integer)
    mv $f ${new}.png
    let a=a+1
done