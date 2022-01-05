window.addEventListener("load", draw); 
window.addEventListener("resize", draw); 

// document.getElementById("canv").onload = 
async function draw()
{
	var canvas = document.getElementById("canv");
	var cw = canvas.width;
	var ch = canvas.height;
	var context = canvas.getContext("2d");

	context.save();
	context.fillStyle = "#E0E0E0";
	context.strokeStyle = "#A5E6E6";
	// context.strokeStyle = "#FF0000";
	context.lineWidth = 3;
	drawGround(context, cw, ch);
	drawPole(context, cw, ch, 200);

	drawPath(context, cw, ch, 350, 90, 50, -9.81, 100+5, ch-50-200);
	// negative gravity to check:
	// - angle <= 180 DONE
	// - angle > 180, weak velocity
	// - angle > 180, strong velocity

	// context.fillStyle = "#A5E6E6";
	context.fillStyle = "#FF0000";
	drawObject(context, cw, ch, 10);
	context.fillStyle = "#E0E0E0";
}

async function drawGround(context, cw, ch)
{
	var groundWidth = cw;
	var groundHeight = 50;
	var groundPosX = 0
	var groundPosY = ch - 50;
	context.fillRect(groundPosX, groundPosY, groundWidth, groundHeight);
}

// height - height of the pole
async function drawPole(context, cw, ch, height)
{
	var poleWidth = 10;
	var poleHeight = height;
	var polePosX = 100;
	var polePosY = ch - 50 - poleHeight;
	context.fillRect(polePosX, polePosY, poleWidth, poleHeight);
}

async function drawObject(context, cw, ch, radius)
{
	var objectRadius = radius;
	var objectPosX = 100 + 5;
	var objectPosY = ch - 50 - 200;
	fillCircle(context, objectPosX, objectPosY, objectRadius);
}

async function fillCircle(ctx, x, y, r)
{
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI);
	ctx.fill();
}

async function drawPath(context, cw, ch, angle, velocity, precision, gravity, x0, y0)
{
	while(angle < 0) // in js modulo on negative numbers does not work xD
	{
		angle += 360;
	}
	if(angle >= 360)
	{
		angle = angle % 360;
	}
	console.log("angle = " + angle);
	console.log("velocity = " + velocity);

	context.beginPath();
	context.moveTo(x0, y0);

	// calculate starting velocity vector from angle and velocity
	var vx = velocity * Math.cos(angle * Math.PI / 180.0);
	var vy = velocity * Math.sin(angle * Math.PI / 180.0);
	console.log("vx = " + vx + ", vy = " + vy);

	var total_time = calcTimeOfFlight(velocity, angle, gravity, ch - 50, ch - 50 - 200);
	console.log("flight time = " + total_time);

	if(gravity == 0)
	{
		if(velocity == 0) // no movement
		{
			return;
		}
		if(angle <= 180) // aiming into the abyss
		{
			context.lineTo((x0 + vx * 1000), (y0 - vy * 1000));
			return;
		}
		else // aiming to the ground, straight line diagonal to the horizontal ground level
		{
			context.lineTo(x0 + 200 * ctan(-angle * Math.PI / 180.0), y0 + 200);
		}
	}
	else if(gravity < 0) // what have I done...
	{
		console.log("Negative gravity case");
		if(angle > 180) // aiming to the ground
		{
			var max_height = vy*vy/(2.0*gravity); // it's always negative in this case
			console.log("max_height = " + max_height);
			if((200 + max_height) > 0) // velocity is too weak to reach the ground
			{
				console.log("Velocity too weak");
				for(var iter = 1; iter <= precision; iter++)
				{
					var time = iter * total_time / precision;
					var x = x0 + time * vx;
					var y = y0 - time * vy + 0.5 * gravity * time * time;
					console.log("x = " + x + ", y = " + y);
					// the roof is actually a floor for us
					context.lineTo(x, y); // TODO: angle needs checking. eventually ctan
				}
			}
			else // velocity fighting against the gravity and reaching the ground
			{
				console.log("Velocity strong enough");
				for(var iter = 1; iter <= precision; iter++)
				{
					var time = iter * total_time / precision;
					var x = x0 + time * vx;
					var y = y0 - time * vy + 0.5 * gravity * time * time;
					console.log("x = " + x + ", y = " + y);
					if(y >= (ch-50)) // hitting the ground, starting the new line with adjusted params
					{
						console.log("BOUNCE");
						// 1) calc the X of touchdown
						// 2) draw line to X
						// 3) calc the angle of touchdown
						// 4) prepare angle for the next drawPath()
						// 5) run new drawPath()
						
						// ch-50-y = elevation of the last point before touchdown
						var hit_x = x + (ch-50-y) * ctan(-angle * Math.PI / 180.0); // 1
						var hit_y = ch - 50;
						context.lineTo(hit_x, hit_y); // 2 // TODO: angle needs checking. eventually ctan
						var hit_vy = -vy + gravity * time;
						var hit_rad = Math.atan(hit_vy/vx); // 3
						var hit_angle = hit_rad * 180.0 / Math.PI;
						hit_angle = 180.0 - hit_angle;
						// while(hit_angle < 0)
						// {
						// 	hit_angle += 180;
						// }
						var bounce_angle = 180.0 - hit_angle; // 4
						var hit_velocity = Math.sqrt(vx*vx + hit_vy*hit_vy);
						console.log("hit at (" + hit_x + ", " + hit_y + ")");
						console.log("vy at hit = " + hit_vy);
						console.log("hit_angle = " + hit_angle);
						console.log("bounce_angle = " + bounce_angle);
						console.log("hit_velocity = " + hit_velocity);
						console.log("AFTER THE BOUNCE");
						context.stroke();
						drawPath(context, cw, ch, bounce_angle, hit_velocity, precision, gravity, hit_x, hit_y); // 5
						return;
					}
					else
					{
						context.lineTo(x, y);
					}
				}
			}
		}
		else // aiming into the abyss!
		{
			for(var iter = 1; iter <= precision; iter++)
			{
				var time = iter * total_time / precision;
				var x = x0 + time * vx;
				var y = y0 - time * vy + 0.5 * gravity * time * time;
				console.log("x = " + x + ", y = " + y);
				// the roof is actually a floor for us
				context.lineTo(x, y); // TODO: angle needs checking. eventually ctan
			}
		}
	}
	else // normal, boring case
	{
		for(var iter = 1; iter <= precision; iter++)
		{
			var time = iter * total_time / precision;
			var x = x0 + time * vx;
			var y = y0 - time * vy + 0.5 * gravity * (time * time); // in canvas Y-axis is inverted
			context.lineTo(x, y);
		}
	}
	context.stroke();
}

function calcTimeOfFlight(velocity, angle, grav_acc, ground_y, start_y)
{
	var elevation = ground_y - start_y; // Y-axis is inverted
	if(elevation <= 0) // sanity check if start is underground
	{
		console.log("Time: Starting point is underground!");
		return 0;
	}
	if(grav_acc == 0) // zeee - rooo... gravity!
	{
		if(velocity == 0) // levitating forever
		{
			console.log("Time: Levitating forever!");
			return Infinity;
		}
		else if(angle <= 180) // endlessly flying
		{
			console.log("Time: Endlessly flying!");
			return Infinity;
		}
		else // aiming to the ground, there is hope!
		{
			console.log("Time: Peeking to the ground!");
			// we have h and angle, so we have everything we need

			// let's for a right triangle
			// x is horizontal, h vertical, s is the trajectory (hypotenuse)
			// sin(angle) = h/s, cos(angle) = x/s
			// tg(angle) = sin/cos = h/s * s/x = h/x
			// x = h / tg(angle)
			// cos(angle) = x/s = h/tg(angle) * 1/s
			// s = h/tg(angle) * 1/cos(angle) = h / sin(angle)
			// v = s * t
			// t = v / s = v * sin(angle) / h
			return Math.sin(angle * Math.PI / 180.0) / elevation;
		}
	}
	else if(grav_acc < 0)
	{
		console.log("Time: Negative gravity case!");
		// ascension time means going down, descension going up
		var vy = velocity * Math.cos(angle * Math.PI / 180.0); ///////// I DONT KNOW HOW THIS APP WORKS WITH THIS INCORRECT LINE
		// (it should be sine instead of cosine)
		var max_height = vy*vy/(2.0*grav_acc);
		if(angle > 180) // aiming to the ground, there is hope!
		{
			if((elevation + max_height) > 0) // velocity is too weak to reach the ground
			{
				console.log("Time: Velocity too weak: elev(" + elevation + ") + max_h(" + max_height + ") > 0");
				// calculate time to reach the roof of the chart
				var ascension_time = vy / grav_acc;
				var descension_time = Math.sqrt(vy*vy + 2.0 * Math.abs(grav_acc) * (1000)) / grav_acc; // temporary fix with 1000
				return -ascension_time - descension_time; // both values are negative, so inverting
			}
			else // velocity powerful enough to hit the ground against the gravity
			{
				console.log("Time: Velocity powerful enough to hit the ground!");
				// no descension time
				var ascension_time = vy / -grav_acc;
				return ascension_time;
			}
		}
		else // going into the abyss
		{
			console.log("Time: angle < 180, going into the abyss!");
			// calculate time to reach the roof of the chart
			var ascension_time = vy / grav_acc;
			var descension_time = Math.sqrt(vy*vy + 2.0 * Math.abs(grav_acc) * (600 - elevation)) / grav_acc;
			return -ascension_time - descension_time; // both values are negative, so inverting
		}
	}
	else
	{
		console.log("Time: normal, boring case :(");
		var vy = velocity * Math.sin(angle * Math.PI / 180.0);
		var ascension_time = vy / grav_acc;
		var descension_time = Math.sqrt(vy*vy + 2.0 * grav_acc * elevation) / grav_acc;
		return ascension_time + descension_time;
	}
}

function ctan(a) // js does not have cotangent...
{
	return 1.0 / Math.tan(a);
}
